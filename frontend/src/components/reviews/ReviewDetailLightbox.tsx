import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { Review } from "../../types/reviews";

interface ReviewDetailLightboxProps {
  review: Review;
  selectedPhotoIndex: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

const ReviewDetailLightbox = ({
  review,
  selectedPhotoIndex,
  onClose,
  onNavigate,
}: ReviewDetailLightboxProps) => {
  if (selectedPhotoIndex === null || !review.photos) return null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-gray-900/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-200"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <button
        className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        title="Close Image"
      >
        <X size={24} />
      </button>

      {review.photos!.length > 1 && (
        <>
          <button
            className={`absolute left-4 md:left-12 w-12 h-12 flex items-center justify-center rounded-full transition-colors z-10 ${selectedPhotoIndex > 0 ? "bg-white/10 hover:bg-white/20 text-white" : "bg-white/5 text-gray-500 cursor-not-allowed hidden md:flex"}`}
            onClick={(e) => {
              e.stopPropagation();
              if (selectedPhotoIndex > 0) onNavigate(selectedPhotoIndex - 1);
            }}
            disabled={selectedPhotoIndex === 0}
          >
            <ChevronLeft size={24} />
          </button>
          <button
            className={`absolute right-4 md:right-12 w-12 h-12 flex items-center justify-center rounded-full transition-colors z-10 ${selectedPhotoIndex < review.photos!.length - 1 ? "bg-white/10 hover:bg-white/20 text-white" : "bg-white/5 text-gray-500 cursor-not-allowed hidden md:flex"}`}
            onClick={(e) => {
              e.stopPropagation();
              if (selectedPhotoIndex < review.photos!.length - 1)
                onNavigate(selectedPhotoIndex + 1);
            }}
            disabled={selectedPhotoIndex === review.photos!.length - 1}
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      <img
        src={review.photos![selectedPhotoIndex].src}
        alt="Full screen view"
        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      />

      {review.photos!.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium bg-black/50 px-4 py-1.5 rounded-full z-10">
          {selectedPhotoIndex + 1} / {review.photos!.length}
        </div>
      )}
    </div>
  );
};

export default ReviewDetailLightbox;
