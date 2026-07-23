export interface NftMetadata {
  name: string;
  description: string;
  image: string;
  attributes: { trait_type: string; value: string }[];
}

/**
 * Upload a file to Pinata IPFS.
 */
export async function uploadFileToIPFS(
  file: File,
  jwt: string
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    "https://api.pinata.cloud/pinning/pinFileToIPFS",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`IPFS upload failed: ${error}`);
  }

  const data = await response.json();
  return `ipfs://${data.IpfsHash}`;
}

/**
 * Pin JSON metadata to IPFS via Pinata.
 */
export async function uploadMetadataToIPFS(
  metadata: NftMetadata,
  jwt: string
): Promise<string> {
  const response = await fetch(
    "https://api.pinata.cloud/pinning/pinJSONToIPFS",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: {
          name: `${metadata.name}-metadata`,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Metadata upload failed: ${error}`);
  }

  const data = await response.json();
  return `ipfs://${data.IpfsHash}`;
}

/**
 * Fetch and parse JSON metadata from IPFS.
 */
export async function fetchMetadataFromIPFS(
  uri: string
): Promise<NftMetadata | null> {
  try {
    const cid = uri.replace("ipfs://", "");
    const url = `https://gateway.pinata.cloud/ipfs/${cid}`;

    const response = await fetch(url);
    if (!response.ok) return null;

    return await response.json();
  } catch {
    return null;
  }
}
