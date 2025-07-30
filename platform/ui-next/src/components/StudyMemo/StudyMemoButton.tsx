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

  const getButtonSize = () => {
    switch (size) {
      case 'sm':
        return 'h-5 w-5';
      case 'md':
        return 'h-6 w-6';
      case 'lg':
        return 'h-7 w-7';
      default:
        return 'h-5 w-5';
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={`${getButtonSize()} flex items-center justify-center rounded bg-black/20 hover:bg-black/40 text-white transition-colors`}
        title="Study Memo"
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