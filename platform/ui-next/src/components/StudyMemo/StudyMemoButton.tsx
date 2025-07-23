import React, { useState } from 'react';
import { Icons } from '../Icons';
import StudyMemoModal from './StudyMemoModal';

interface StudyMemoButtonProps {
  studyInstanceUID: string;
  size?: 'sm' | 'md' | 'lg';
}

const StudyMemoButton: React.FC<StudyMemoButtonProps> = ({
  studyInstanceUID,
  size = 'sm'
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 부모 요소의 클릭 이벤트 방지
    setIsModalOpen(true);
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'h-[12px] w-[12px]';
      case 'md':
        return 'h-[14px] w-[14px]';
      case 'lg':
        return 'h-[16px] w-[16px]';
      default:
        return 'h-[12px] w-[12px]';
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={`flex items-center justify-center rounded bg-primary/20 hover:bg-primary/30 text-primary-light ${getIconSize()}`}
        title="Study Memo"
        style={{
          minWidth: size === 'sm' ? '16px' : size === 'md' ? '18px' : '20px',
          minHeight: size === 'sm' ? '16px' : size === 'md' ? '18px' : '20px'
        }}
      >
        <Icons.InfoSeries className={getIconSize()} />
      </button>

      <StudyMemoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        studyInstanceUID={studyInstanceUID}
      />
    </>
  );
};

export { StudyMemoButton }; 