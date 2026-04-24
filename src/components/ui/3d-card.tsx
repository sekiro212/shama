"use client";

import { cn } from "@/lib/utils";
import React, { useRef } from "react";

export const CardContainer = ({
  children,
  className,
  containerClassName,
  onMouseEnter: onMouseEnterProp,
  onMouseLeave: onMouseLeaveProp,
}: {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>;
}) => {
  const isTouchLikeRef = useRef(false);

  const handlePointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
    isTouchLikeRef.current = e.pointerType === "touch" || e.pointerType === "pen";
  };

  const handlePointerLeave = () => {
    isTouchLikeRef.current = false;
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouchLikeRef.current) return;
    onMouseEnterProp?.(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouchLikeRef.current) return;
    onMouseLeaveProp?.(e);
  };

  return (
    <div
      className={cn("py-20 flex items-center justify-center", containerClassName)}
    >
      <div
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn("flex items-center justify-center relative", className)}
      >
        {children}
      </div>
    </div>
  );
};

export const CardBody = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return <div className={cn("relative", className)}>{children}</div>;
};

export const CardItem = ({
  as: Tag = "div",
  children,
  className,
  translateX: _translateX = 0,
  translateY: _translateY = 0,
  translateZ: _translateZ = 0,
  rotateX: _rotateX = 0,
  rotateY: _rotateY = 0,
  rotateZ: _rotateZ = 0,
  ...rest
}: {
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  translateX?: number | string;
  translateY?: number | string;
  translateZ?: number | string;
  rotateX?: number | string;
  rotateY?: number | string;
  rotateZ?: number | string;
  [key: string]: any;
}) => {
  return (
    <Tag className={className} {...rest}>
      {children}
    </Tag>
  );
};
