# git-checkpoint.ps1
# Executado automaticamente pelo hook Stop do Claude Code.
# Commita e faz push de docs/CHECKPOINT.md ao final de cada sessao.

$staged = git diff --cached --name-only
$unstaged = git diff --name-only docs/CHECKPOINT.md

# Adiciona CHECKPOINT.md se houver alteracoes
if ($unstaged -or (git status --porcelain docs/CHECKPOINT.md)) {
    git add docs/CHECKPOINT.md
}

# Verifica se ha algo para commitar
$toCommit = git diff --cached --name-only
if ($toCommit) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    git commit -m "auto: checkpoint [$timestamp] — session stop"
    git push
    Write-Host "✓ Checkpoint commitado e enviado ao repositorio remoto."
} else {
    Write-Host "— Nenhuma alteracao em CHECKPOINT.md para commitar."
}
