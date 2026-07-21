import React from 'react';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-xl ${className}`}
      style={{ background: 'rgba(0,0,0,0.06)', ...style }}
    />
  );
}

export function SkeletonGrid({ count = 9 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: '12px 0' }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} style={{ height: 100, borderRadius: 16 }} />
      ))}
    </div>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 0' }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} style={{ height: 64, borderRadius: 14 }} />
      ))}
    </div>
  );
}

export function SkeletonCalendar() {
  return (
    <div style={{ padding: '12px 0' }}>
      <Skeleton style={{ height: 44, borderRadius: 12, marginBottom: 12 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} style={{ height: 80, borderRadius: 12 }} />
        ))}
      </div>
    </div>
  );
}
