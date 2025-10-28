# PowerShell script to take screenshot
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Wait for PowerPoint to fully load
Start-Sleep -Seconds 3

# Capture screen
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap $screen.Width, $screen.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)

# Save screenshot
$screenshotPath = "C:\Users\Mac\OneDrive\Desktop\Projects\pdflab.pro\powerpoint_proof_screenshot.png"
$bitmap.Save($screenshotPath, [System.Drawing.Imaging.ImageFormat]::Png)

Write-Host "Screenshot saved to: $screenshotPath"

# Clean up
$graphics.Dispose()
$bitmap.Dispose()