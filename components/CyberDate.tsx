import React from 'react';

interface CyberDateProps {
  date: string;
  className?: string;
}

/** 与永久链接保持同一套 UTC 日期，避免访客时区改变显示结果 */
const CyberDate: React.FC<CyberDateProps> = ({ date, className = '' }) => {
  const dateObj = new Date(date);

  if (Number.isNaN(dateObj.getTime())) {
    return <span className={className}>{date}</span>;
  }

  const year = dateObj.getUTCFullYear();
  const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getUTCDate()).padStart(2, '0');
  const formattedDate = `${year}年${month}月${day}日`;

  return (
    <time
      className={`inline-flex items-center font-mono tracking-wider ${className}`}
      dateTime={dateObj.toISOString()}
      aria-label={`日期：${formattedDate}`}
    >
      <span className="text-cyber-cyan">{year}</span>
      <span className="text-gray-600">年</span>
      <span className="text-cyber-yellow">{month}</span>
      <span className="text-gray-600">月</span>
      <span className="text-white">{day}</span>
      <span className="text-gray-600">日</span>
    </time>
  );
};

export default CyberDate;
