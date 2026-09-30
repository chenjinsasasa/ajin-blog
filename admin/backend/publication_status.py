#!/usr/bin/env python3
"""Read-only business status; cron transport status is deliberately not an input."""
import argparse
from datetime import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import stat

class Invalid(Exception): pass

def require(value, reason):
    if not value: raise Invalid(reason)

def read(path):
    fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW)
    with os.fdopen(fd,'rb') as f:
        require(stat.S_ISREG(os.fstat(f.fileno()).st_mode),'not_regular')
        return f.read()

def sha(raw):return hashlib.sha256(raw).hexdigest()

def timestamp(value):
    require(isinstance(value,str),'timestamp_missing')
    result=datetime.fromisoformat(value)
    require(result.tzinfo is not None and result.utcoffset() is not None,'timestamp_timezone_missing')
    return result

def completion_timing(completed,receipt,date,run):
    require(completed.get('status')==receipt.get('status'),'completion_status_mismatch')
    reserved=timestamp(completed.get('reserved_at'))
    completed_at=timestamp(completed.get('completed_at'))
    # operator-verified recoveries share the same field contract regardless of program vs manual origin.
    if receipt.get('recovery_type') in ('operator_verified_recovery', 'program_operator_resume'):
        require(receipt.get('automatic_run_status')=='failed','operator_automatic_status_invalid')
        original_path=Path(receipt['original_failure_receipt_path'])
        original_raw=read(original_path)
        require(sha(original_raw)==receipt.get('original_failure_receipt_sha256'),'original_failure_hash_mismatch')
        original=json.loads(original_raw)
        require(original.get('schema_version')=='blog_publish_terminal_guard.v2'
                and original.get('guard_run_id')==run and original.get('target_date')==date
                and original.get('executor',{}).get('run_id')==run
                and original.get('executor',{}).get('session_id')==run
                and original.get('status')=='notify' and original.get('terminal_gate_passed') is False
                and original.get('published') is False,'original_failure_invalid')
        # program_operator_resume renamed the timestamp anchor from operator_verified_at to operator_resume_started_at; accept either.
        operator_verified_at = receipt.get('operator_verified_at') or receipt.get('operator_resume_started_at')
        require(timestamp(original.get('started_at'))<=reserved<=timestamp(original.get('completed_at'))
                <=timestamp(operator_verified_at)<=completed_at,'operator_reservation_time_mismatch')
        require(read(original_path)==original_raw,'original_failure_changed_during_observation')
    else:
        require('recovery_type' not in receipt,'recovery_type_unknown')
        require(timestamp(receipt.get('started_at'))<=reserved<=timestamp(receipt.get('completed_at'))
                <=completed_at,'completion_reservation_time_mismatch')

def check(date,ledger_path,receipt_root):
    raw=read(ledger_path);ledger=json.loads(raw)
    require(ledger.get('schema_version')=='blog_publish_pending.v1' and 'pending' in ledger and isinstance(ledger.get('completed_dates'),dict),'ledger_invalid')
    completed=ledger['completed_dates'].get(date);pending=ledger['pending']
    if pending is not None:
        require(isinstance(pending,dict) and re.fullmatch('[0-9a-f]{32}',pending.get('guard_run_id','')) and pending.get('session_id')==pending['guard_run_id'],'pending_invalid')
    if completed:
        require(isinstance(completed,dict) and completed.get('target_date')==date,'completion_invalid')
        require(not pending or pending.get('target_date')!=date,'completion_pending_conflict')
        path=Path(completed['terminal_receipt_path']);receipt_raw=read(path)
        require(sha(receipt_raw)==completed.get('terminal_receipt_sha256'),'receipt_hash_mismatch')
        receipt=json.loads(receipt_raw);run=completed.get('guard_run_id');executor=receipt.get('executor',{})
        require(re.fullmatch('[0-9a-f]{32}',run or '') and completed.get('session_id')==run,'completion_run_invalid')
        require(receipt.get('schema_version')=='blog_publish_terminal_guard.v2' and receipt.get('guard_run_id')==run and receipt.get('target_date')==date and executor.get('run_id')==run and executor.get('session_id')==run,'receipt_identity_invalid')
        completion_timing(completed,receipt,date,run)
        pair=(receipt.get('status'),receipt.get('reason'))
        if pair==('ok','terminal_gate_passed'):
            require(receipt.get('terminal_gate_passed') is True and receipt.get('published') is True,'published_evidence_invalid')
            if receipt.get('recovery_type')=='operator_verified_recovery':
                # Legacy operator settlements never dispatched publication and omitted this field.
                require('side_effects_allowed' not in receipt or receipt['side_effects_allowed'] is False,'operator_side_effects_invalid')
            elif receipt.get('recovery_type')=='program_operator_resume':
                # program-path operator resume actually publishes; side_effects_allowed must be true (same as natural chain).
                require(receipt.get('side_effects_allowed') is True,'published_side_effects_invalid')
            else:
                require(receipt.get('side_effects_allowed') is True,'published_side_effects_invalid')
            status='published'
        elif pair==('skipped_no_public_material','no_public_material'):
            require(all(receipt.get(key) is False for key in ('published','terminal_gate_passed','side_effects_allowed')),'skip_evidence_invalid');status='skipped'
        else:raise Invalid('completion_not_success')
        result={'status':status,'exit_code':0,'run_id':run,'receipt_path':str(path),'receipt_sha256':sha(receipt_raw),
                'recovery_type':receipt.get('recovery_type','none'),
                'automatic_run_status':receipt.get('automatic_run_status') if receipt.get('recovery_type') in ('operator_verified_recovery', 'program_operator_resume') else receipt['status'],
                # This ledger proves business completion, not the scheduler origin of a run.
                'natural_schedule_verified':False}
    elif pending:
        result={'status':'pending','exit_code':2,'pending':pending,'reason':'unresolved_reservation'}
        if pending.get('target_date')==date:
            path=Path(receipt_root)/date/(pending['guard_run_id']+'.json')
            if path.exists():
                receipt_raw=read(path);receipt=json.loads(receipt_raw)
                require(receipt.get('schema_version')=='blog_publish_terminal_guard.v2' and receipt.get('guard_run_id')==pending['guard_run_id'] and receipt.get('target_date')==date,'pending_receipt_identity_invalid')
                require(datetime.fromisoformat(receipt['started_at'])<=datetime.fromisoformat(pending['reserved_at'])<=datetime.fromisoformat(receipt['completed_at']),'receipt_stale_for_reservation')
                if receipt.get('status')=='notify' and receipt.get('terminal_gate_passed') is False and receipt.get('published') is False:
                    result.update(status='failed',reason=receipt.get('reason'),receipt_path=str(path),receipt_sha256=sha(receipt_raw),receipt_binding='pending_identity_and_time_only')
                else:raise Invalid('unsettled_receipt_not_terminal')
    else:
        # An orphan or newer receipt cannot override the durable completion ledger.
        result={'status':'unknown','exit_code':3,'reason':'no_bound_completion_or_reservation'}
    require(read(ledger_path)==raw,'ledger_changed_during_observation')
    if 'receipt_path' in result:require(sha(read(Path(result['receipt_path'])))==result['receipt_sha256'],'receipt_changed_during_observation')
    return {'schema_version':'blog_publish_status.v1','target_date':date,'ledger_sha256':sha(raw),**result}

def observe(date,ledger_path,receipt_root):
    try:
        require(re.fullmatch(r'\d{4}-\d{2}-\d{2}',date),'date_invalid');datetime.strptime(date,'%Y-%m-%d')
        return check(date,Path(ledger_path),Path(receipt_root))
    except Exception as exc:
        return {'schema_version':'blog_publish_status.v1','target_date':date,'status':'unknown','exit_code':3,'reason':f'{type(exc).__name__}:{exc}'}

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('date');parser.add_argument('--ledger',type=Path,required=True);parser.add_argument('--receipt-root',type=Path,required=True);args=parser.parse_args()
    result=observe(args.date,args.ledger,args.receipt_root);print(json.dumps(result,ensure_ascii=False,sort_keys=True));return result['exit_code']
if __name__=='__main__':raise SystemExit(main())
