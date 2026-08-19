Add-Type -AssemblyName System.Drawing
$width = 512
$height = 512
$bmp = New-Object System.Drawing.Bitmap $width, $height
$graphics = [System.Drawing.Graphics]::FromImage($bmp)

# Fill background with #1f1f1f
$graphics.Clear([System.Drawing.Color]::FromArgb(31, 31, 31))

# Load the icon
$iconPath = "d:\Pictures - Copy\Desktop\New folder (5)\Remindo\Remindo\frontend\assets\icon.png"
$icon = [System.Drawing.Image]::FromFile($iconPath)

# Draw icon in center (384x384 so it has some padding)
$iconWidth = 384
$iconHeight = 384
$x = ($width - $iconWidth) / 2
$y = ($height - $iconHeight) / 2
$graphics.DrawImage($icon, $x, $y, $iconWidth, $iconHeight)

$outPath = "d:\Pictures - Copy\Desktop\New folder (5)\Remindo\Remindo\frontend\assets\playstore_icon.png"
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose()
$bmp.Dispose()
$icon.Dispose()

Write-Output "Play Store icon created at $outPath"
