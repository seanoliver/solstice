# Runbooks

Use runbooks for repeatable operational procedures where ordering, verification, or recovery matters.

## Naming

Use a stable task-oriented name such as `rotate-resend-webhook-secret.md`. Update the same runbook as the procedure changes.

## Quality bar

Start from `TEMPLATE.md`. A runbook must state prerequisites, exact steps, success checks, and failure recovery. Commands should be safe to copy, identify the environment they target, and avoid embedding credentials or private data.

Set the status to `stale` when the procedure has not been verified after a relevant system change; do not leave an unsafe procedure looking current.
