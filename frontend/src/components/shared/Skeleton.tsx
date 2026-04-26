import React from "react";

interface SkeletonProps {
  className?: string;
  variant?: "rect" | "circle" | "text";
  animation?: "pulse" | "none";
}

const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  variant = "rect",
  animation = "pulse",
}) => {
  const baseClasses = "bg-gray-200";
  const animationClasses = animation === "pulse" ? "animate-pulse" : "";

  const variantClasses = {
    rect: "rounded-lg",
    circle: "rounded-full",
    text: "rounded h-4 w-full",
  };

  return (
    <div
      className={`${baseClasses} ${animationClasses} ${variantClasses[variant]} ${className}`}
    />
  );
};

export default Skeleton;
