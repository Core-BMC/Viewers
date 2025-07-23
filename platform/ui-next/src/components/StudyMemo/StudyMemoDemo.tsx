import React, { useState } from 'react';
import { StudyMemoModal } from './StudyMemoModal';
import { StudyMemoService } from '../../services/StudyMemoService';

const StudyMemoDemo: React.FC = () => {
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

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Study Memo Demo</h2>
      
      <div className="mb-4">
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Open Study Memo Modal
        </button>
      </div>

      <div className="bg-gray-100 p-4 rounded">
        <h3 className="text-lg font-semibold mb-2">사용법:</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>위의 "Open Study Memo Modal" 버튼을 클릭하세요</li>
          <li>Study Instance UID: 1.2.3.4.5.6.7.8.9 (테스트용)</li>
          <li>메모를 작성하고 "Save Memo" 버튼을 클릭하세요</li>
          <li>DICOM SR 형태로 Orthanc에 저장됩니다</li>
        </ol>
      </div>

      <StudyMemoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        studyInstanceUID="1.2.3.4.5.6.7.8.9"
        onSaveMemo={handleSaveMemo}
        onLoadMemo={handleLoadMemo}
      />
    </div>
  );
};

export { StudyMemoDemo }; 