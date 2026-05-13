#!/usr/bin/env pwsh
# test-webhook.ps1
# Simula o webhook do Asaas localmente para testar a integração
# Uso: .\test-webhook.ps1 -CustomerId "cus_123" -Event "PAYMENT_RECEIVED"

param(
    [string]$CustomerId = "cus_TEST123",  # Deve ser o asaas_customer_id da tabela accounts
    [string]$Event = "PAYMENT_RECEIVED",
    [string]$WebhookUrl = "https://whzxmuozumymgopgtslq.supabase.co/functions/v1/asaas-webhook",
    [string]$Token = "whsec_emq15df7qvkXkpgFZHLacjWY-xqDtQhDnCIvpeulQE8"
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WedPlan - Teste de Webhook Asaas" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Evento:     $Event" -ForegroundColor Yellow
Write-Host "Cliente:    $CustomerId" -ForegroundColor Yellow
Write-Host "URL:        $WebhookUrl" -ForegroundColor Yellow
Write-Host ""

$payload = @{
    event = $Event
    payment = @{
        id           = "pay_" + [System.Guid]::NewGuid().ToString().Substring(0, 8)
        customer     = $CustomerId
        subscription = $null
        status       = if ($Event -eq "PAYMENT_RECEIVED") { "RECEIVED" } else { "OVERDUE" }
        value        = 97.90
        netValue     = 95.00
        dueDate      = (Get-Date).ToString("yyyy-MM-dd")
    }
} | ConvertTo-Json -Depth 4

Write-Host "Payload enviado:" -ForegroundColor Gray
Write-Host $payload -ForegroundColor DarkGray
Write-Host ""

try {
    $headers = @{
        "Content-Type"         = "application/json"
        "asaas-access-token"   = $Token
    }

    $response = Invoke-RestMethod `
        -Uri $WebhookUrl `
        -Method POST `
        -Headers $headers `
        -Body $payload `
        -ErrorAction Stop

    Write-Host "✅ SUCESSO! Resposta da Edge Function:" -ForegroundColor Green
    $response | ConvertTo-Json | Write-Host -ForegroundColor Green
} catch {
    Write-Host "❌ ERRO na requisição:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red

    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $body = $reader.ReadToEnd()
        Write-Host "Corpo do erro: $body" -ForegroundColor DarkRed
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verifique os logs em:" -ForegroundColor Cyan
Write-Host "  Supabase → Edge Functions → Logs" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
