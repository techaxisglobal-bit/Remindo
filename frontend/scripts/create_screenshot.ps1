Add-Type -AssemblyName System.Drawing
$width = 1080
$height = 1920
$bmp = New-Object System.Drawing.Bitmap $width, $height
$graphics = [System.Drawing.Graphics]::FromImage($bmp)

# Fill background with #1f1f1f
$graphics.Clear([System.Drawing.Color]::FromArgb(31, 31, 31))

# Load the icon
$iconPath = "d:\Pictures - Copy\Desktop\New folder (5)\Remindo\Remindo\frontend\assets\icon.png"
$icon = [System.Drawing.Image]::FromFile($iconPath)

# Draw icon in center (600x600)
$iconWidth = 600
$iconHeight = 600
$x = ($width - $iconWidth) / 2
$y = ($height - $iconHeight) / 2 - 200 # slightly higher than center
$graphics.DrawImage($icon, $x, $y, $iconWidth, $iconHeight)

$outPath = "d:\Pictures - Copy\Desktop\New folder (5)\Remindo\Remindo\frontend\assets\screenshot_placeholder.png"
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose()
$bmp.Dispose()
$icon.Dispose()

Write-Output "Screenshot created at $outPath"
