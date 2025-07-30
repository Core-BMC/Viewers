import React, { useState, useEffect } from 'react';
import { StudyMemoService, type LoadResult } from '../../services/StudyMemoService';
import { Icons } from '../Icons';

interface StudyMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  studyInstanceUID: string;
}

interface Message {
  type: 'success' | 'warning' | 'error';
  text: string;
}

const StudyMemoModal: React.FC<StudyMemoModalProps> = ({
  isOpen,
  onClose,
  studyInstanceUID
}) => {
  const [memo, setMemo] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [saveResult, setSaveResult] = useState<any>(null);
  const [loadResult, setLoadResult] = useState<LoadResult | null>(null);
  const [orthancStatus, setOrthancStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [opacity, setOpacity] = useState(0);
  const [loadSourceMessage, setLoadSourceMessage] = useState<string>('');

  // 안전한 서비스 초기화
  const [memoService] = useState(() => new StudyMemoService());

  useEffect(() => {
    if (isOpen && studyInstanceUID) {
      loadMemo();
      checkOrthancConnection();
    }
  }, [isOpen, studyInstanceUID]);

  const checkOrthancConnection = async () => {
    try {
      setOrthancStatus('checking');
      const isConnected = await memoService.testOrthancConnection();
      setOrthancStatus(isConnected ? 'connected' : 'disconnected');
    } catch (error) {
      setOrthancStatus('disconnected');
    }
  };

  const loadMemo = async () => {
    if (!studyInstanceUID) return;

    setIsLoading(true);
    setMessage(null);
    setSaveResult(null);
    setLoadResult(null);
    setLoadSourceMessage('');

    try {
      const result = await memoService.loadMemo(studyInstanceUID);
      
      if (result.memo) {
        setMemo(result.memo);
      } else {
        setMemo('');
      }
      
      setLoadResult(result);
      setLoadSourceMessage(result.message);
      
    } catch (error) {
      console.error('Error loading memo:', error);
      setMemo('');
      setMessage({ type: 'error', text: '메모를 불러오는 중 오류가 발생했습니다.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!studyInstanceUID || !memo.trim()) return;

    setIsSaving(true);
    setMessage(null);
    setSaveResult(null);
    setLoadResult(null); // 저장 시 불러오기 상태 초기화

    try {
      const result = await memoService.saveMemo(studyInstanceUID, memo);
      setSaveResult(result);
      
      if (result.success) {
        if (result.orthancSaved && result.localBackupSaved) {
          setMessage({
            type: 'success',
            text: 'DICOM 파일에 메모가 직접 저장되었습니다. (로컬 백업도 유지됨)'
          });
        } else if (result.orthancSaved) {
          setMessage({
            type: 'success',
            text: 'DICOM 파일에 메모가 저장되었습니다.'
          });
        } else if (result.localBackupSaved) {
          setMessage({
            type: 'warning',
            text: 'Orthanc 연결 실패로 로컬 스토리지에 백업 저장되었습니다.'
          });
        }
      } else {
        setMessage({
          type: 'error',
          text: 'DICOM 파일 및 로컬 백업 저장 모두 실패했습니다.'
        });
      }
    } catch (error) {
      console.error('Save error:', error);
      setMessage({
        type: 'error',
        text: `저장 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!studyInstanceUID) return;

    // 확인 메시지
    if (!confirm('정말로 이 메모를 삭제하시겠습니까?')) {
      return;
    }

    setIsDeleting(true);
    setMessage(null);
    setSaveResult(null);
    setLoadResult(null); // 삭제 시 상태 초기화
    setLoadSourceMessage(''); // 소스 메시지도 초기화

    try {
      await memoService.deleteMemo(studyInstanceUID);
      setMemo(''); // 메모 입력창 비우기
      setMessage({ type: 'success', text: '메모가 삭제되었습니다.' });
    } catch (error) {
      console.error('Error deleting memo:', error);
      setMessage({ 
        type: 'error', 
        text: `삭제 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}` 
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isLoading && !isSaving && !isDeleting) {
      onClose();
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOpacity(parseFloat(e.target.value));
  };

  // 컴포넌트 언마운트 시 이벤트 리스너 정리
  useEffect(() => {
    return () => {
      // No specific cleanup needed for range input
    };
  }, []);

  const getOrthancStatusText = () => {
    switch (orthancStatus) {
      case 'checking':
        return 'Orthanc 서버 연결 확인 중...';
      case 'connected':
        return 'Orthanc 서버 연결됨';
      case 'disconnected':
        return 'Orthanc 서버 연결 안됨 (로컬 백업 사용)';
      default:
        return '';
    }
  };

  const getOrthancStatusIcon = () => {
    switch (orthancStatus) {
      case 'checking':
        return <Icons.StatusError className="h-4 w-4 animate-spin text-blue-400" />;
      case 'connected':
        return <Icons.StatusSuccess className="h-4 w-4 text-green-500" />;
      case 'disconnected':
        return <Icons.StatusWarning className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  // 모달이 닫혀있으면 렌더링하지 않음
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-lg border border-secondary-light" style={{ backgroundColor: `rgba(0, 0, 0, ${opacity})` }}>
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-secondary-light px-4 py-3" style={{ backgroundColor: `rgba(30, 30, 30, ${opacity})` }}>
          <div className="flex items-center gap-2">
            <Icons.InfoSeries className="h-4 w-4 text-white" />
            <h2 className="text-base font-medium text-white">Study Memo</h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded p-1 text-muted-foreground hover:bg-secondary-main hover:text-white transition-colors"
            disabled={isLoading || isSaving || isDeleting}
          >
            <Icons.Close className="h-4 w-4" />
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="p-4 space-y-3">
          {/* Orthanc 상태 표시 */}
          <div className={`rounded border p-3 ${
            orthancStatus === 'connected'
              ? 'bg-green-900/20 border-green-500/30'
              : orthancStatus === 'disconnected'
              ? 'bg-yellow-900/20 border-yellow-500/30'
              : 'bg-blue-900/20 border-blue-500/30'
          }`} style={{ backgroundColor: `rgba(0, 0, 0, ${opacity * 0.8})` }}>
            <div className="flex items-center gap-2">
              {getOrthancStatusIcon()}
              <span className={`text-sm ${
                orthancStatus === 'connected' ? 'text-green-400' :
                orthancStatus === 'disconnected' ? 'text-yellow-400' :
                'text-blue-400'
              }`}>
                {getOrthancStatusText()}
              </span>
            </div>
            {orthancStatus === 'disconnected' && (
              <p className="mt-1 text-xs text-yellow-300">
                Orthanc 서버에 연결할 수 없어 로컬 스토리지에 백업됩니다.
              </p>
            )}
          </div>

          {/* 불러오기 상태 */}
          {loadResult && (
            <div className="rounded border border-secondary-light p-2" style={{ backgroundColor: `rgba(30, 30, 30, ${opacity * 0.9})` }}>
              <div className="flex items-center gap-2">
                <div className={`h-1.5 w-1.5 rounded-full ${
                  loadResult.source === 'orthanc' ? 'bg-green-500' :
                  loadResult.source === 'local' ? 'bg-yellow-500' :
                  'bg-gray-500'
                }`} />
                <span className={`text-xs ${
                  loadResult.source === 'orthanc' ? 'text-green-400' :
                  loadResult.source === 'local' ? 'text-yellow-400' :
                  'text-gray-400'
                }`}>
                  {loadSourceMessage}
                </span>
              </div>
            </div>
          )}

          {/* 메모 입력 영역 */}
          <div className="space-y-2">
            <textarea
              value={memo || ''}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Study에 대한 메모를 입력하세요..."
              rows={12}
              disabled={isLoading}
              className="w-full resize-y rounded border border-secondary-light px-3 py-2 text-white placeholder-muted-foreground focus:border-primary focus:outline-none disabled:opacity-50"
              style={{ backgroundColor: `rgba(30, 30, 30, ${opacity * 0.9})` }}
            />
          </div>

          {/* 저장 결과 표시 */}
          {saveResult && (
            <div className={`rounded border p-3 ${
              saveResult.success
                ? 'border-green-500/30'
                : 'border-red-500/30'
            }`} style={{ backgroundColor: `rgba(0, 0, 0, ${opacity * 0.8})` }}>
              <div className="flex items-center gap-2">
                <div className={`h-1.5 w-1.5 rounded-full ${
                  saveResult.success ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className={`text-sm font-medium ${
                  saveResult.success ? 'text-green-400' : 'text-red-400'
                }`}>
                  {saveResult.message}
                </span>
              </div>
            </div>
          )}

          {/* 기존 메시지 표시 */}
          {message && (
            <div className={`rounded border p-3 ${
              message.type === 'success' ? 'border-green-500/30' :
              message.type === 'warning' ? 'border-yellow-500/30' :
              'border-red-500/30'
            }`} style={{ backgroundColor: `rgba(0, 0, 0, ${opacity * 0.8})` }}>
              <div className="flex items-center gap-2">
                {message.type === 'success' && <Icons.StatusSuccess className="h-4 w-4 text-green-400" />}
                {message.type === 'warning' && <Icons.StatusWarning className="h-4 w-4 text-yellow-400" />}
                {message.type === 'error' && <Icons.StatusError className="h-4 w-4 text-red-400" />}
                <span className={`text-sm ${
                  message.type === 'success' ? 'text-green-400' :
                  message.type === 'warning' ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {message.text}
                </span>
              </div>
            </div>
          )}

          {/* 디버그 정보 (개발 모드에서만 표시) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="rounded border border-secondary-light p-2" style={{ backgroundColor: `rgba(30, 30, 30, ${opacity * 0.9})` }}>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <div><strong>디버그 정보:</strong></div>
                <div>• Study Instance UID: {studyInstanceUID || 'N/A'}</div>
                <div>• 저장 방식: {orthancStatus === 'connected' ? 'Orthanc DICOM SR' : '로컬 백업'}</div>
                <div>• 메모 길이: {(memo || '').length} 문자</div>
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-between border-t border-secondary-light px-4 py-3" style={{ backgroundColor: `rgba(30, 30, 30, ${opacity})` }}>
          {/* 투명도 조절 슬라이더 */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-white">투명도:</span>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={opacity}
                onChange={handleSliderChange}
                className="w-24 h-2 bg-secondary-light rounded-lg appearance-none cursor-pointer slider"
              />
              <span className="text-xs text-white w-8 text-right">{Math.round(opacity * 100)}%</span>
            </div>
          </div>

          {/* 버튼들 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={isLoading || isSaving || isDeleting || !memo.trim()}
              className="flex items-center gap-1.5 rounded border border-red-500 bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 hover:border-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out"
            >
              {isDeleting ? (
                <>
                  <Icons.StatusError className="h-3 w-3 animate-spin" />
                  삭제 중...
                </>
              ) : (
                <>
                  <Icons.Delete className="h-3 w-3" />
                  메모 삭제
                </>
              )}
            </button>

            <button
              onClick={handleSave}
              disabled={isLoading || isSaving || isDeleting || !memo.trim()}
              className="flex items-center gap-1.5 rounded bg-primary-main px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-main/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out"
            >
              {isSaving ? (
                <>
                  <Icons.StatusError className="h-3 w-3 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Icons.Download className="h-3 w-3" />
                  Orthanc에 저장
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyMemoModal; 