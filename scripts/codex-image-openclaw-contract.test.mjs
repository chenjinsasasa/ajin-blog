import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { validateBriefArtifact, validateVisualBrief, textHash } from './lib/blog-brief-contract.mjs'
import { assertLocalFile, assertSafeDestination, imageEnvironment } from './lib/blog-image-isolation.mjs'
import { buildCodexImageArgs } from './lib/blog-cover-image-prompt.mjs'
const repo = path.resolve(import.meta.dirname, '..')
const config = JSON.parse(fs.readFileSync(path.join(repo, 'config/blog-cover-image2.json')))
const body = '真实工作记录。'.repeat(35)
const rawPost = `---\ntitle: 测试\nexcerpt: 测试摘要\ndate: '2026-09-20'\ncoverImage: /covers/example.png\n---\n${body}\n`
const visualBrief = {coreEventZh:'事件',primarySubjectZh:'主体',keyActionZh:'动作',resultZh:'结果',tensionZh:'张力',industrialMetaphorZh:'隐喻',supportingSymbolsZh:['人','机器','阀门'],sceneDescriptionZh:'场景',focalElementsEn:['an engineer','a press','a valve'],imagePromptEn:'An engineer inspects a press beside a valve.'}
function artifact() {return {schemaVersion:2,briefVersion:config.briefVersion,promptVersion:config.promptVersion,generatedBy:'openclaw',provenanceVersion:'openclaw-text-v1',executionMode:'configured-model',provider:'claude',model:'claude-sonnet-4-6',api:'anthropic-messages',postPath:'content/progress/example.mdx',postSha256:textHash(rawPost),bodySha256:textHash(body),visualBrief}}
const options = {config,postPath:'content/progress/example.mdx',rawPost,body,date:'2026-09-20',current:true}

test('新合同拒绝旧来源、未知版本、哈希漂移和伪造模型',()=>{
 assert.doesNotThrow(()=>validateBriefArtifact(artifact(),options))
 for (const change of [{schemaVersion:1,generatedBy:'codex'},{provenanceVersion:'unknown'},{postSha256:'0'.repeat(64)},{model:'unknown'}]) {
  assert.throws(()=>validateBriefArtifact({...artifact(),...change},options))
 }
 const old={...artifact(),schemaVersion:1,generatedBy:'codex',executionMode:'full-article-analysis'}
 assert.doesNotThrow(()=>validateBriefArtifact(old,{...options,current:false,date:'2026-09-19'}))
 assert.throws(()=>validateBriefArtifact(old,{...options,current:false,date:'2026-09-20'}))
})
test('brief 额外字段与超长内容不能绕过校验',()=>{
 assert.throws(()=>validateVisualBrief({...visualBrief,unknown:true}))
 assert.throws(()=>validateVisualBrief({...visualBrief,imagePromptEn:'a'.repeat(501)}))
 assert.throws(()=>validateVisualBrief({...visualBrief,focalElementsEn:['one','two']}))
})
test('生图 dry-run 零代理调用，过期 brief 在生图前被拒绝',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'blog-contract-test-'))
 try {
  for (const dir of ['config','content/progress','content/cover-briefs','public/covers']) fs.mkdirSync(path.join(tmp,dir),{recursive:true})
  fs.writeFileSync(path.join(tmp,'config/blog-cover-image2.json'),JSON.stringify(config))
  for (const ref of config.references) {fs.mkdirSync(path.dirname(path.join(tmp,ref.path)),{recursive:true});fs.copyFileSync(path.join(repo,ref.path),path.join(tmp,ref.path))}
  fs.writeFileSync(path.join(tmp,options.postPath),rawPost)
  const briefPath=path.join(tmp,'content/cover-briefs/example.json')
  fs.writeFileSync(briefPath,JSON.stringify(artifact()))
  const cmd=[path.join(repo,'scripts/generate-blog-cover-image2.mjs'),'--post',options.postPath,'--dry-run']
  const env={...process.env,CODEX_CLI_PATH:'/nonexistent-forbidden-codex',PATH:'/nonexistent'}
  const good=spawnSync(process.execPath,cmd,{cwd:tmp,env,encoding:'utf8'})
  assert.equal(good.status,0,good.stderr); assert.equal(JSON.parse(good.stdout).action,'dry-run')
  fs.writeFileSync(briefPath,JSON.stringify({...artifact(),bodySha256:'stale'}))
  const bad=spawnSync(process.execPath,cmd,{cwd:tmp,env,encoding:'utf8'})
  assert.equal(bad.status,1);assert.match(bad.stderr,/哈希已过期/)
 } finally {fs.rmSync(tmp,{recursive:true,force:true})}
})
test('生图权限和环境只允许专用输出，拒绝软链接逃逸',()=>{
 const args=buildCodexImageArgs('/image-work')
 assert.ok(args.includes('default_permissions="blog-image"'))
 assert.ok(args.includes('permissions.blog-image.network.enabled=false'))
 assert.ok(!args.includes('danger-full-access'));assert.ok(!args.includes('--add-dir'))
 assert.deepEqual(imageEnvironment({PATH:'/bin',OPENAI_API_KEY:'secret',AIPAIBOX_API_KEY:'secret',SSH_AUTH_SOCK:'/agent'}),{PATH:'/bin'})
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'blog-path-test-'))
 try {
  const a=path.join(tmp,'a');const b=path.join(tmp,'b');fs.mkdirSync(a);fs.mkdirSync(b)
  fs.writeFileSync(path.join(b,'real.png'),'old');fs.symlinkSync(path.join(b,'real.png'),path.join(a,'candidate.png'))
  assert.throws(()=>assertLocalFile(path.join(a,'candidate.png'),a))
  assert.throws(()=>assertSafeDestination(path.join(a,'candidate.png'),a))
  fs.symlinkSync(b,path.join(a,'escape'))
  assert.throws(()=>assertSafeDestination(path.join(a,'escape/new.png'),a))
 } finally {fs.rmSync(tmp,{recursive:true,force:true})}
})

test('仅接受独立终态标记，提示词回显不能伪造成功', async()=>{
 const {successfulImageResult}=await import('./lib/blog-image-process.mjs')
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'blog-final-test-'))
 try {
  const final=path.join(tmp,'final.txt'), candidate=path.join(tmp,'candidate.png')
  fs.writeFileSync(candidate,'png')
  const stdout=`CODEX_IMAGE_RESULT status=ok output=${candidate}`
  assert.equal(successfulImageResult({status:0,stdout},final,candidate),false)
  fs.writeFileSync(final,'CODEX_IMAGE_RESULT status=failed')
  assert.equal(successfulImageResult({status:0,stdout},final,candidate),false)
  fs.writeFileSync(final,stdout+'\n')
  assert.equal(successfulImageResult({status:0,stdout:''},final,candidate),true)
  assert.equal(successfulImageResult({status:1,stdout},final,candidate),false)
 } finally {fs.rmSync(tmp,{recursive:true,force:true})}
})
test('生图子进程超时会回收进程组', async()=>{
 const {runImageProcess}=await import('./lib/blog-image-process.mjs')
 const start=Date.now()
 const r=await runImageProcess('/bin/sh',['-c','sleep 60 & wait'],{timeoutMs:50,stream:false})
 assert.equal(r.status,124);assert.ok(Date.now()-start<4000)
})

test('真实生成器反例：缺图、旧图、越界候选及优化失败均拒绝，恢复原封面和清单', async (t)=>{
 const sharp=(await import('sharp')).default
 const oldPng=await sharp({create:{width:16,height:9,channels:3,background:'#112233'}}).png().toBuffer()
 const freshPng=await sharp({create:{width:16,height:9,channels:3,background:'#aabbcc'}}).png().toBuffer()
 for (const mode of ['missing','same','symlink','install-failure','optimizer-failure','new-optimizer-failure','optimized-same']) {
  await t.test(mode,()=>{
   const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'blog-generator-negative-'))
   let imageDirectory
   try {
    for (const dir of ['config','content/progress','content/cover-briefs','public/covers','scripts']) fs.mkdirSync(path.join(tmp,dir),{recursive:true})
    const fakeCurl=path.join(tmp,'fake-curl')
    fs.writeFileSync(fakeCurl,'#!/bin/sh\nexit 0\n',{mode:0o755})
    const fixtureConfig={...config,routeGuard:{attempts:1,requiredPasses:1,maxGenerationAttempts:1,
     curlPath:fakeCurl,clashSocket:path.join(tmp,'nonexistent-socket'),proxyUrl:'',probeUrl:'https://fixture.invalid'}}
    fs.writeFileSync(path.join(tmp,'config/blog-cover-image2.json'),JSON.stringify(fixtureConfig))
    for(const ref of config.references){fs.mkdirSync(path.dirname(path.join(tmp,ref.path)),{recursive:true});fs.copyFileSync(path.join(repo,ref.path),path.join(tmp,ref.path))}
    fs.writeFileSync(path.join(tmp,options.postPath),rawPost)
    fs.writeFileSync(path.join(tmp,'content/cover-briefs/example.json'),JSON.stringify(artifact()))
    const destination=path.join(tmp,'public/covers/example.png')
    const manifest=path.join(tmp,'scripts/cover-optimization-manifest.json')
    const originalManifest=Buffer.from('{"preserve":"original"}\n')
    const existing=mode!=='new-optimizer-failure'
    if(existing){fs.writeFileSync(destination,oldPng);fs.writeFileSync(manifest,originalManifest)}
    const source=path.join(tmp,'source.png');fs.writeFileSync(source,mode==='same'?oldPng:freshPng)
    const calls=path.join(tmp,'optimizer-called')
    fs.writeFileSync(path.join(tmp,'scripts/optimize-covers.mjs'),
     `import fs from 'node:fs';fs.writeFileSync(${JSON.stringify(calls)},'yes');fs.writeFileSync(${JSON.stringify(manifest)},'changed');`+
     (mode==='optimized-same'
      ? `fs.writeFileSync(process.argv[2],Buffer.from(${JSON.stringify(oldPng.toString('base64'))},'base64'));`
      : `fs.writeFileSync(process.argv[2],'partially installed');process.exit(17);`))
    const fakeCodex=path.join(tmp,'fake-codex')
    fs.writeFileSync(fakeCodex,`#!${process.execPath}\nconst fs=require('node:fs'),path=require('node:path');
const candidate=path.join(process.cwd(),'candidate.png');
const args=process.argv.slice(2);const final=args[args.indexOf('--output-last-message')+1];
const mode=${JSON.stringify(mode)};
if(mode==='install-failure'){const receipt=JSON.parse(fs.readFileSync(path.join(process.cwd(),'receipt.json')));fs.writeFileSync(${JSON.stringify(destination)}+'.'+receipt.runId+'.tmp','collision');}
if(mode==='symlink')fs.symlinkSync(${JSON.stringify(source)},candidate);
else if(mode!=='missing')fs.copyFileSync(${JSON.stringify(source)},candidate);
fs.writeFileSync(final,'CODEX_IMAGE_RESULT status=ok output='+candidate+'\\n');
`,{mode:0o755})
    const result=spawnSync(process.execPath,[path.join(repo,'scripts/generate-blog-cover-image2.mjs'),'--post',options.postPath,'--force'],
     {cwd:tmp,env:{...process.env,CODEX_CLI_PATH:fakeCodex},encoding:'utf8',timeout:15000})
    assert.equal(result.status,1,result.stderr)
    const receiptPath=result.stderr.match(/\[cover:image2\] receipt (.+)/)?.[1]
    assert.ok(receiptPath,result.stderr);imageDirectory=path.dirname(receiptPath)
    assert.equal(JSON.parse(fs.readFileSync(receiptPath,'utf8')).status,'failed')
    if(existing){assert.deepEqual(fs.readFileSync(destination),oldPng);assert.deepEqual(fs.readFileSync(manifest),originalManifest)}
    else {assert.equal(fs.existsSync(destination),false);assert.equal(fs.existsSync(manifest),false)}
    if(mode==='install-failure')assert.match(result.stderr,/EEXIST/)
    if(mode==='same')assert.match(result.stderr,/生图返回旧图片/)
    if(mode==='symlink')assert.match(result.stderr,/不是普通文件或越过工作目录/)
    if(mode==='optimized-same')assert.match(result.stderr,/优化后图片与旧图片相同/)
    assert.equal(fs.existsSync(calls),['optimizer-failure','new-optimizer-failure','optimized-same'].includes(mode))
    assert.equal(fs.readdirSync(path.dirname(destination)).some(name=>name.endsWith('.tmp')),false)
   } finally {
    if(imageDirectory)fs.rmSync(imageDirectory,{recursive:true,force:true})
    fs.rmSync(tmp,{recursive:true,force:true})
   }
  })
 }
})
