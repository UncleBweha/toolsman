import { useNavigate } from "react-router-dom";
import { Tag } from "lucide-react";

interface ProductTagsProps {
  tags?: string[];
  generatedTags?: string[];
  className?: string;
}

/**
 * ProductTags — renders clickable pill tags below a product description.
 * Clicking a tag navigates to /search?tag=<tag> showing products with that tag.
 */
const ProductTags = ({ tags = [], generatedTags = [], className = "" }: ProductTagsProps) => {
  const navigate = useNavigate();

  // Merge manual tags + generated tags, deduplicate, limit to 15
  const allTags = Array.from(
    new Set([...tags, ...generatedTags].map((t) => t?.trim()).filter(Boolean))
  ).slice(0, 15);

  if (allTags.length === 0) return null;

  const handleTagClick = (tag: string) => {
    navigate(`/search?tag=${encodeURIComponent(tag)}`);
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
        <Tag className="h-3 w-3" />
        <span>Tags</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {allTags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => handleTagClick(tag)}
            className="
              inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium
              bg-gray-100 text-gray-600 border border-gray-200
              hover:bg-[#FF5722]/10 hover:text-[#FF5722] hover:border-[#FF5722]/30
              active:scale-95 transition-all duration-150 cursor-pointer select-none
            "
            aria-label={`Browse products tagged "${tag}"`}
          >
            #{tag}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProductTags;
