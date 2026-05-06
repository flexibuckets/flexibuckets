param (
    [Parameter(Mandatory=$true)]
    [string]$LocalFolderPath,
    
    [Parameter(Mandatory=$true)]
    [string]$TargetBucketId, # The ID of the bucket you are uploading into
    
    [string]$TargetParentFolderId = $null # <-- NOW OPTIONAL
)

# --- CONFIGURATION ---
$ApiKey = "flex_l4EC1LSaY_3MrnQyqQDlSsD0jkFguKa9"
$BaseUrl = "http://localhost:3000"
$Headers = @{
    "Authorization" = "Bearer $ApiKey"
    "Content-Type"  = "application/json"
}

# --- API Endpoints ---
$CreateFolderUrl = "$BaseUrl/api/v1/folders"
$UploadRequestUrl = "$BaseUrl/api/v1/files/upload-request"
$UploadCompleteUrl = "$BaseUrl/api/v1/files/upload-complete"

# --- Recursive Upload Function ---
function Upload-Directory {
    param (
        [string]$directoryPath,
        [string]$parentId
    )

    Write-Host " "
    Write-Host "--- Processing directory: $directoryPath ---"

    # Loop through all items
    foreach ($item in Get-ChildItem -Path $directoryPath) {
        if ($item.PSIsContainer) {
            # --- It's a directory, create it remotely ---
            $dirName = $item.Name
            Write-Host "Creating remote folder: $dirName"

            $createFolderBody = @{
                name = $dirName
                s3CredentialId = $TargetBucketId
                parentId = $parentId
            } | ConvertTo-Json

            try {
                # This now finds-or-creates
                $response = Invoke-RestMethod -Uri $CreateFolderUrl -Method Post -Headers $Headers -Body $createFolderBody
                $newParentId = $response.id
                
                if (-not $newParentId) {
                    Write-Error "Error creating folder: $response"
                    continue
                }

                Write-Host "Remote folder created with ID: $newParentId"
                
                # Recurse into the subdirectory
                Upload-Directory -directoryPath $item.FullName -parentId $newParentId
            } catch {
                Write-Error "Failed to create folder: $_.Exception.Message"
            }
            
        } else {
            # --- It's a file, upload it ---
            $fileName = $item.Name
            $fileSize = $item.Length
            
            $contentType = "application/octet-stream" # Default
            
            Write-Host "Uploading file: $fileName (Size: $fileSize, Type: $contentType)"

            try {
                # 1. Request Upload URL
                $uploadRequestBody = @{
                    fileName = $fileName
                    fileSize = $fileSize
                    contentType = $contentType
                    folderId = $parentId
                } | ConvertTo-Json

                $uploadResponse = Invoke-RestMethod -Uri $UploadRequestUrl -Method Post -Headers $Headers -Body $uploadRequestBody
                $uploadUrl = $uploadResponse.uploadUrl
                $fileId = $uploadResponse.fileId

                if (-not $uploadUrl) {
                    Write-Error "Error getting upload URL: $uploadResponse"
                    continue
                }

                # 2. Upload file directly to S3/Minio
                Write-Host "Uploading to S3..."
                $putHeaders = @{
                    "Content-Type"   = $contentType
                    "Content-Length" = $fileSize
                }
                
                Invoke-RestMethod -Uri $uploadUrl -Method Put -InFile $item.FullName -Headers $putHeaders

                Write-Host "S3 Upload successful."

                # 3. Complete Upload
                Write-Host "Completing upload for file ID: $fileId"
                $completeBody = @{ fileId = $fileId } | ConvertTo-Json
                
                Invoke-RestMethod -Uri $UploadCompleteUrl -Method Post -Headers $Headers -Body $completeBody

                Write-Host "File upload complete: $fileName"

            } catch {
                Write-Error "Failed to upload file '$fileName': $_.Exception.Message"
            }
        }
    }
}

# --- SCRIPT START ---
Write-Host "Starting folder upload..."
$EffectiveParentId = $null

if ([string]::IsNullOrEmpty($TargetParentFolderId)) {
    # --- ID NOT Provided ---
    # 1. Get the local folder name
    $LocalFolderName = (Get-Item -Path $LocalFolderPath).Name
    Write-Host "TargetParentFolderId not provided. Finding or creating root folder '$LocalFolderName' in bucket '$TargetBucketId'..."

    # 2. Call API to find or create this folder at the root
    $createFolderBody = @{
        name = $LocalFolderName
        s3CredentialId = $TargetBucketId
        parentId = $null # <-- Create at root
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri $CreateFolderUrl -Method Post -Headers $Headers -Body $createFolderBody
        $EffectiveParentId = $response.id
        
        if (-not $EffectiveParentId) {
            Write-Error "Could not find or create remote root folder. API Response: $response"
            exit 1
        }
        Write-Host "Uploading contents to remote folder '$LocalFolderName' (ID: $EffectiveParentId)"
    } catch {
        Write-Host "Failed to find or create remote folder: $_.Exception.Message"
        Write-Error "Failed to find or create remote folder: $_.Exception.Message"
        exit 1
    }
} else {
    # --- ID IS Provided ---
    Write-Host "Using provided TargetParentFolderId: $TargetParentFolderId"
    $EffectiveParentId = $TargetParentFolderId
}

# 3. Start the recursive upload with the correct parent ID
Upload-Directory -directoryPath $LocalFolderPath -parentId $EffectiveParentId

Write-Host "--- All tasks complete ---"

