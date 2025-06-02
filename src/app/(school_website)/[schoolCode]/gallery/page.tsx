
import React from 'react';
import { Typography, Row, Col, Empty, Card, Tag, Image as AntImage, Select as AntSelect, Button } from 'antd'; // AntSelect for album filtering
import Link from 'next/link';
import type { IGalleryItem } from '@/models/Tenant/GalleryItem';
import { PictureOutlined } from '@ant-design/icons';

interface GalleryPageProps {
  params: { schoolCode: string };
  searchParams?: { album?: string };
}

async function getGalleryData(schoolCode: string, album?: string): Promise<{ items: IGalleryItem[], albums: string[], error?: string }> {
  let items: IGalleryItem[] = [];
  let albums: string[] = [];
  let errorMsg: string | undefined = undefined;

  try {
    let itemsUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/${schoolCode}/website/gallery`;
    const queryParams = new URLSearchParams();
    if (album) {
      queryParams.append('album', album);
    }
    // queryParams.append('adminView', 'false'); // Explicitly public view
    const fullItemsUrl = `${itemsUrl}?${queryParams.toString()}`;
    
    // console.log(`[Public Gallery Page] Fetching items from: ${fullItemsUrl}`);
    const itemsRes = await fetch(fullItemsUrl, { cache: 'no-store' });

    if (!itemsRes.ok) {
      const responseText = await itemsRes.text();
      errorMsg = `Failed to fetch gallery items for ${schoolCode}, album ${album}. Status: ${itemsRes.status}. Response: ${responseText.substring(0, 500)}`;
      console.error(errorMsg);
      return { items, albums, error: errorMsg };
    }

    try {
      items = await itemsRes.json();
      if (!Array.isArray(items)) {
        errorMsg = `API response for items was not an array. School: ${schoolCode}, Album: ${album}. Received: ${JSON.stringify(items).substring(0,200)}`;
        console.error(errorMsg);
        items = []; // Reset to empty array if response is not as expected
      }
    } catch (e: any) {
      const responseText = await itemsRes.text(); // Re-read text if JSON parsing fails
      errorMsg = `Failed to parse JSON for gallery items. School: ${schoolCode}, Album: ${album}. Error: ${e.message}. API Response: ${responseText.substring(0, 500)}`;
      console.error(errorMsg);
      return { items: [], albums, error: errorMsg };
    }

    // Fetch all unique album names if no specific album is selected, for the filter dropdown
    // Always fetch all albums for the dropdown regardless of current filter
    // console.log(`[Public Gallery Page] Fetching all albums for school: ${schoolCode}`);
    const allAlbumsRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/${schoolCode}/website/gallery?adminView=false`, { cache: 'no-store' });
    if (allAlbumsRes.ok) {
      try {
        const allItemsData: IGalleryItem[] = await allAlbumsRes.json();
        if (Array.isArray(allItemsData)) {
          albums = Array.from(new Set(allItemsData.map(item => item.album).filter(Boolean) as string[])).sort();
        } else {
          console.warn(`[Public Gallery Page] API response for all albums was not an array. School: ${schoolCode}`);
        }
      } catch (e: any) {
        console.error(`[Public Gallery Page] Failed to parse JSON for all albums. School: ${schoolCode}. Error: ${e.message}`);
      }
    } else {
      console.error(`[Public Gallery Page] Failed to fetch all albums for filter. Status: ${allAlbumsRes.status}`);
    }
    
    return { items, albums, error: errorMsg };
  } catch (e: any) {
    errorMsg = `Generic error in getGalleryData function for ${schoolCode}. Error: ${e.message}`;
    console.error(errorMsg, e);
    return { items, albums, error: errorMsg };
  }
}

export default async function PublicGalleryPage({ params, searchParams }: GalleryPageProps) {
  const { schoolCode } = params;
  const selectedAlbum = searchParams?.album;
  const { items, albums, error } = await getGalleryData(schoolCode, selectedAlbum);

  if (error) {
    return (
        <div className="container mx-auto px-4 py-8 text-center">
            <Typography.Title level={2} className="mb-8 text-center">
                <PictureOutlined className="mr-2" /> School Gallery
            </Typography.Title>
            <Alert message="Error Loading Gallery" description="We encountered an issue while trying to load the gallery. Please try again later." type="error" showIcon />
            <pre className="mt-4 p-4 bg-gray-100 text-left text-xs overflow-auto max-h-60 rounded">{error}</pre>
        </div>
    );
  }


  const groupedByAlbum: { [key: string]: IGalleryItem[] } = {};
  if (!selectedAlbum) {
    items.forEach(item => {
      const albumKey = item.album || 'uncategorized';
      if (!groupedByAlbum[albumKey]) {
        groupedByAlbum[albumKey] = [];
      }
      groupedByAlbum[albumKey].push(item);
    });
  }


  return (
    <div className="container mx-auto px-4 py-8">
      <Typography.Title level={2} className="mb-2 text-center">
        <PictureOutlined className="mr-2" /> School Gallery
      </Typography.Title>
      {selectedAlbum && (
        <Typography.Title level={4} className="mb-6 text-center font-normal">
          Album: <Tag color="blue" className="text-lg px-2 py-1">{selectedAlbum}</Tag>
           <Link href={`/${schoolCode}/gallery`} className="ml-2 text-sm text-primary hover:underline">(View All Albums)</Link>
        </Typography.Title>
      )}

      {!selectedAlbum && albums.length > 0 && (
        <div className="mb-8 text-center">
          <Typography.Text className="mr-2">Filter by Album:</Typography.Text>
          <AntSelect
            style={{ width: 250 }}
            allowClear
            placeholder="Select an album"
            onChange={(value) => {
              if (value) {
                window.location.href = `/${schoolCode}/gallery?album=${encodeURIComponent(value)}`;
              } else {
                window.location.href = `/${schoolCode}/gallery`;
              }
            }}
            defaultValue={selectedAlbum}
          >
            {albums.map(albumName => (
              <AntSelect.Option key={albumName} value={albumName}>
                {albumName.charAt(0).toUpperCase() + albumName.slice(1)}
              </AntSelect.Option>
            ))}
          </AntSelect>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center mt-10">
          <Empty description={selectedAlbum ? `No images found in the album "${selectedAlbum}".` : "No gallery items found. Please check back later."} />
          {selectedAlbum && <Link href={`/${schoolCode}/gallery`}><Button type="link" className="mt-4">Back to All Albums</Button></Link>}
        </div>
      ) : (
        selectedAlbum ? (
          <Row gutter={[16, 16]}>
            {items.map((item) => (
              <Col xs={24} sm={12} md={8} lg={6} key={item._id as string}>
                <Card
                  hoverable
                  className="overflow-hidden shadow-lg rounded-lg h-full"
                  cover={
                    <AntImage
                      alt={item.title || 'Gallery Image'}
                      src={item.imageUrl}
                      className="w-full h-56 object-cover"
                      preview={{
                        src: item.imageUrl,
                        mask: <div className="flex items-center justify-center text-white"><PictureOutlined style={{fontSize: '24px'}}/> View</div>
                      }}
                    />
                  }
                >
                  {item.title && <Card.Meta title={<span className="font-semibold text-base">{item.title}</span>} />}
                  {item.description && <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }} className="text-sm mt-1">{item.description}</Typography.Paragraph>}
                  {item.tags && item.tags.length > 0 && (
                    <div className="mt-2">
                      {item.tags.map(tag => <Tag key={tag} className="text-xs">{tag}</Tag>)}
                    </div>
                  )}
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          Object.entries(groupedByAlbum).map(([albumName, albumItems]) => (
            <div key={albumName} className="mb-12">
              <Typography.Title level={3} className="mb-4 capitalize">
                <Link href={`/${schoolCode}/gallery?album=${encodeURIComponent(albumName === 'uncategorized' ? '' : albumName)}`} className="hover:text-primary">
                  {albumName === 'uncategorized' ? 'Uncategorized Images' : albumName} ({albumItems.length})
                </Link>
              </Typography.Title>
              <Row gutter={[16, 16]}>
                {albumItems.slice(0,8).map((item) => ( 
                  <Col xs={24} sm={12} md={8} lg={6} key={item._id as string}>
                     <Card
                        hoverable
                        className="overflow-hidden shadow-lg rounded-lg h-full"
                        cover={
                          <AntImage
                            alt={item.title || 'Gallery Image'}
                            src={item.imageUrl}
                            className="w-full h-56 object-cover"
                             preview={{
                                src: item.imageUrl,
                                mask: <div className="flex items-center justify-center text-white"><PictureOutlined style={{fontSize: '24px'}}/> View</div>
                              }}
                          />
                        }
                      >
                        {item.title && <Card.Meta title={<span className="font-semibold text-base">{item.title}</span>} />}
                        {item.description && <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }} className="text-sm mt-1">{item.description}</Typography.Paragraph>}
                         {item.tags && item.tags.length > 0 && (
                            <div className="mt-2">
                            {item.tags.map(tag => <Tag key={tag} className="text-xs">{tag}</Tag>)}
                            </div>
                        )}
                      </Card>
                  </Col>
                ))}
              </Row>
              {albumItems.length > 8 && (
                <div className="text-center mt-4">
                   <Link href={`/${schoolCode}/gallery?album=${encodeURIComponent(albumName === 'uncategorized' ? '' : albumName)}`}>
                    <Button type="link">View all {albumItems.length} images in {albumName === 'uncategorized' ? 'Uncategorized' : albumName}</Button>
                  </Link>
                </div>
              )}
            </div>
          ))
        )
      )}
    </div>
  );
}
