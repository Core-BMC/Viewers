import React, { useState } from 'react';
import { Icons } from '../Icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '../Tooltip';
import { StudyMemoModal } from './StudyMemoModal';
import { StudyMemoService } from '../../services/StudyMemoService';

interface SimpleStudyMemoButtonProps {
  studyInstanceUID: string;
  className?: string;
}

const SimpleStudyMemoButton: React.FC<SimpleStudyMemoButtonProps> = ({
  studyInstanceUID,
  className = '',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [studyMemoService] = useState(() => new StudyMemoService());

  const handleSaveMemo = async (studyUID: string, memo: string) => {
    try {
      await studyMemoService.saveMemo(studyUID, memo);
      console.log('Memo saved successfully');
    } catch (error) {
      console.error('Failed to save memo:', error);
      throw error;
    }
  };

  const handleLoadMemo = async (studyUID: string) => {
    try {
      return await studyMemoService.loadMemo(studyUID);
    } catch (error) {
      console.error('Failed to load memo:', error);
      return null;
    }
  };

  const handleClick = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <Tooltip>
        <TooltipContent>
          <div className="flex flex-1 flex-row">
            <div className="flex-2 flex items-center justify-center pr-4">
              <Icons.InfoSeries className="text-primary" />
            </div>
            <div className="flex flex-1 flex-col">
              <span>
                <span className="text-white">Study Memo</span>
              </span>
              <span className="text-muted-foreground text-xs">
                Add or edit study memo
              </span>
            </div>
          </div>
        </TooltipContent>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            className={`group flex h-[20px] w-[20px] cursor-pointer items-center justify-center rounded hover:bg-primary/20 ${className}`}
          >
            <Icons.InfoSeries className="text-primary-light h-[15px] w-[15px] group-hover:hidden" />
            <Icons.InfoSeries className="text-primary-light hidden h-[15px] w-[15px] group-hover:block" />
          </button>
        </TooltipTrigger>
      </Tooltip>

      <StudyMemoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        studyInstanceUID={studyInstanceUID}
        onSaveMemo={handleSaveMemo}
        onLoadMemo={handleLoadMemo}
      />
    </>
  );
};

export { SimpleStudyMemoButton }; 