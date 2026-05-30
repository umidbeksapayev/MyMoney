# Script chạy migration cho Recurring Transactions
# Dành cho Windows PowerShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AURORA LEDGER - Run Migration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "HƯỚNG DẪN LẤY DATABASE_URL:" -ForegroundColor Yellow
Write-Host "1. Vào https://dashboard.render.com" -ForegroundColor White
Write-Host "2. Click vào PostgreSQL database" -ForegroundColor White
Write-Host "3. Tab 'Info' → Tìm 'External Database URL'" -ForegroundColor White
Write-Host "4. Click 'Copy' để copy URL" -ForegroundColor White
Write-Host ""

# Prompt user for DATABASE_URL
$DATABASE_URL = Read-Host "Paste DATABASE_URL vào đây và Enter"

if ([string]::IsNullOrWhiteSpace($DATABASE_URL)) {
    Write-Host "❌ Error: Chưa nhập DATABASE_URL!" -ForegroundColor Red
    Write-Host "Vui lòng chạy lại script và paste URL." -ForegroundColor Red
    pause
    exit 1
}

Write-Host ""
Write-Host "🔄 Đang chạy migration..." -ForegroundColor Yellow

# Set environment variable
$env:DATABASE_URL = $DATABASE_URL

# Run migration
try {
    node scripts/migrate-recurring-transactions.js
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  ✅ MIGRATION THÀNH CÔNG!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Bây giờ bạn có thể:" -ForegroundColor White
        Write-Host "1. Vào web Aurora Ledger" -ForegroundColor White
        Write-Host "2. Tạo Recurring Transaction" -ForegroundColor White
        Write-Host "3. Nó sẽ hoạt động! 🎉" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "❌ Migration thất bại!" -ForegroundColor Red
        Write-Host "Vui lòng check lại DATABASE_URL" -ForegroundColor Red
    }
} catch {
    Write-Host ""
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host ""
pause

