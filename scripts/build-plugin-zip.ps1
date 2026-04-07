$ErrorActionPreference = 'Stop'

$pluginRoot = Split-Path -Parent $PSScriptRoot
$pluginSlug = 'flexify-dashboard'
$releaseRoot = Join-Path $pluginRoot 'release'
$stagingRoot = Join-Path $releaseRoot $pluginSlug
$zipPath = Join-Path $releaseRoot "$pluginSlug.zip"
$pluginFile = Join-Path $pluginRoot "$pluginSlug.php"

function New-CleanDirectory {
	param (
		[string] $Path
	)

	if (Test-Path $Path) {
		Remove-Item -Recurse -Force $Path
	}

	New-Item -ItemType Directory -Path $Path | Out-Null
}

function Copy-IfExists {
	param (
		[string] $Source,
		[string] $Destination
	)

	if (-not (Test-Path $Source)) {
		return
	}

	$destinationParent = Split-Path -Parent $Destination

	if ($destinationParent -and -not (Test-Path $destinationParent)) {
		New-Item -ItemType Directory -Path $destinationParent -Force | Out-Null
	}

	Copy-Item -Path $Source -Destination $Destination -Recurse -Force
}

function Copy-LanguageFiles {
	$languagesRoot = Join-Path $pluginRoot 'languages'
	$targetRoot = Join-Path $stagingRoot 'languages'
	$extensions = @('.json', '.mo', '.po', '.pot')

	if (-not (Test-Path $languagesRoot)) {
		return
	}

	New-Item -ItemType Directory -Path $targetRoot -Force | Out-Null

	Get-ChildItem -Path $languagesRoot -File | Where-Object {
		$extensions -contains $_.Extension.ToLowerInvariant() -and
		$_.Name -notin @('package.json', 'package-lock.json')
	} | ForEach-Object {
		Copy-Item -Path $_.FullName -Destination (Join-Path $targetRoot $_.Name) -Force
	}
}

function Get-PluginVersion {
	$versionLine = Get-Content $pluginFile | Where-Object { $_ -match '^\s*\*\s*Version:\s*' } | Select-Object -First 1

	if (-not $versionLine) {
		return '0.0.0'
	}

	return ($versionLine -replace '^\s*\*\s*Version:\s*', '').Trim()
}

New-CleanDirectory -Path $releaseRoot
New-Item -ItemType Directory -Path $stagingRoot -Force | Out-Null

$topLevelFiles = @(
	'flexify-dashboard.php',
	'README.md',
	'licence.md',
	'changelog.txt'
)

foreach ($file in $topLevelFiles) {
	Copy-IfExists -Source (Join-Path $pluginRoot $file) -Destination (Join-Path $stagingRoot $file)
}

$directoryMappings = @(
	@{ Source = 'admin'; Destination = 'admin' },
	@{ Source = 'assets'; Destination = 'assets' },
	@{ Source = 'dist'; Destination = 'dist' },
	@{ Source = 'app\dist'; Destination = 'app\dist' }
)

foreach ($mapping in $directoryMappings) {
	Copy-IfExists `
		-Source (Join-Path $pluginRoot $mapping.Source) `
		-Destination (Join-Path $stagingRoot $mapping.Destination)
}

Copy-LanguageFiles

$manifest = [ordered]@{
	name = $pluginSlug
	version = Get-PluginVersion
	generatedAt = (Get-Date).ToUniversalTime().ToString('o')
	zipFile = Split-Path -Leaf $zipPath
}

$manifest | ConvertTo-Json | Set-Content -Path (Join-Path $releaseRoot 'manifest.json')

if (Test-Path $zipPath) {
	Remove-Item -Force $zipPath
}

Compress-Archive -Path $stagingRoot -DestinationPath $zipPath -Force

Write-Host "ZIP created: $zipPath"
