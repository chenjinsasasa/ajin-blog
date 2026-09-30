import fcntl
import signal
import time
from datetime import datetime

from .collector import collect
from .core import Config, backup, connection, get_meta, now, set_meta


def main():
    config = Config.load()
    lock = (config.data / "worker.lock").open("w")
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    active = True

    def stop(*_):
        nonlocal active
        active = False

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    while active:
        try:
            collect(config)
        except Exception as e:
            with connection(config) as c:
                last = get_meta(c, "collector", {})
                last.update(
                    last_attempt=now(),
                    errors=[type(e).__name__ + ": collection failed"],
                    repo_ready=config.repo.is_dir(),
                )
                set_meta(c, "collector", last)
        try:
            with connection(config) as c:
                last = get_meta(c, "backup", {})
            if last.get("date") != datetime.now().date().isoformat():
                path = backup(config)
                with connection(config) as c:
                    set_meta(
                        c,
                        "backup",
                        {
                            "date": datetime.now().date().isoformat(),
                            "file": path.name,
                            "status": "ok",
                        },
                    )
        except Exception as e:
            with connection(config) as c:
                set_meta(c, "backup", {"status": "failed", "reason": type(e).__name__})
        with connection(config) as c:
            set_meta(c, "heartbeat", time.time())
        for _ in range(10):
            if not active:
                break
            time.sleep(1)
    with connection(config) as c:
        set_meta(c, "heartbeat", 0)


if __name__ == "__main__":
    main()
