import fcntl

import uvicorn

from .api import create_app
from .core import Config


def main():
    config = Config.load()
    lock = (config.data / "api.lock").open("w")
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    uvicorn.run(
        create_app(config), host="127.0.0.1", port=config.port, access_log=False
    )


if __name__ == "__main__":
    main()
