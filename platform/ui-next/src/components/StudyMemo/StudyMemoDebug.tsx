import React, { useState } from 'react';
import { StudyMemoService } from '../../services/StudyMemoService';

const StudyMemoDebug: React.FC = () => {
  const [studyInstanceUID, setStudyInstanceUID] = useState('1.2.3.4.5.6.7.8.9');
  const [memo, setMemo] = useState('');
  const [loadedMemo, setLoadedMemo] = useState<string | null>(null);
  const [studyMemoService] = useState(() => new StudyMemoService());

  const handleSave = async () => {
    try {
      await studyMemoService.saveMemo(studyInstanceUID, memo);
      alert('메모가 저장되었습니다!');
      setMemo('');
    } catch (error) {
      alert('저장 실패: ' + error);
    }
  };

  const handleLoad = async () => {
    try {
      const loaded = await studyMemoService.loadMemo(studyInstanceUID);
      setLoadedMemo(loaded);
      if (loaded) {
        alert('메모를 불러왔습니다!');
      } else {
        alert('저장된 메모가 없습니다.');
      }
    } catch (error) {
      alert('불러오기 실패: ' + error);
    }
  };

  const handleClear = () => {
    studyMemoService.clearAllMemos();
    alert('모든 메모가 삭제되었습니다!');
    setLoadedMemo(null);
  };

  const handleCheck = async () => {
    const hasMemo = await studyMemoService.hasMemo(studyInstanceUID);
    alert(hasMemo ? '메모가 있습니다!' : '메모가 없습니다.');
  };

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Study Memo 디버그</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Study Instance UID:</label>
          <input
            type="text"
            value={studyInstanceUID}
            onChange={(e) => setStudyInstanceUID(e.target.value)}
            className="w-full p-2 border rounded text-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">메모 내용:</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="w-full p-2 border rounded h-32 text-black"
            placeholder="메모를 입력하세요..."
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            저장
          </button>
          <button
            onClick={handleLoad}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            불러오기
          </button>
          <button
            onClick={handleCheck}
            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-700"
          >
            확인
          </button>
          <button
            onClick={handleClear}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            모두 삭제
          </button>
        </div>

        {loadedMemo && (
          <div>
            <label className="block text-sm font-medium mb-2">불러온 메모:</label>
            <div className="p-2 bg-white border rounded text-black">
              {loadedMemo}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { StudyMemoDebug }; 