"""Legacy compatibility shim.

R2 downloads are intentionally no longer supported by the evaluator. Local
storage and GitHub handling live in ``evaluation_workspace``.
"""


def downloadFiles(*args, **kwargs):
    raise RuntimeError("R2 downloads are disabled in the code evaluator")
