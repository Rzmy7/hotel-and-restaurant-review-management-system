import React from 'react';
import { Image as ImageIcon } from 'lucide-react';


const ReviewImageGallery = () => {
  // Placeholder images - will be replaced with backend data
  const placeholderImages = [
    { id: 1, url: '', alt: 'Review image 1' },
    { id: 2, url: '', alt: 'Review image 2' },
    { id: 3, url: '', alt: 'Review image 3' },
    { id: 4, url: '', alt: 'Review image 4' },
    { id: 5, url: '', alt: 'Review image 5' },
  ];

  return (
    <div className="bg-white rounded-lg p-5 px-6 mb-6 border border-gray-200 max-md:p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-semibold text-gray-800 m-0">Recent Review Images</h3>
        <span className="text-[13px] text-gray-500 font-medium">{placeholderImages.length} images</span>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 max-md:grid-cols-[repeat(auto-fill,minmax(100px,1fr))] max-md:gap-2">
        {placeholderImages.map((image) => (
          <div key={image.id} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md">
            {image.url ? (
              <img
                src={image.url}
                alt={image.alt}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 text-gray-400 gap-2">
                <ImageIcon size={32} className="text-gray-300" />
                <span className="text-xs font-medium text-gray-400">Image {image.id}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewImageGallery;
