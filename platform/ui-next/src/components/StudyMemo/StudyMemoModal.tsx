import React, { useState, useEffect } from 'react';
import { StudyMemoService, type LoadResult } from '../../services/StudyMemoService';

interface StudyMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  studyInstanceUID: string;
}

const StudyMemoModal: React.FC<StudyMemoModalProps> = ({
  isOpen,
  onClose,
  studyInstanceUID,
}) => {
  const [memo, setMemo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [orthancStatus, setOrthancStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [saveResult, setSaveResult] = useState<{ success: boolean; orthancSaved: boolean; localBackupSaved: boolean; message: string } | null>(null);
  const [loadResult, setLoadResult] = useState<LoadResult | null>(null);
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
    setMessage(null);
    setSaveResult(null);
    setLoadResult(null);
    setLoadSourceMessage('');
    onClose();
  };

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

  const getOrthancStatusColor = () => {
    switch (orthancStatus) {
      case 'connected':
        return 'green';
      case 'disconnected':
        return 'orange';
      default:
        return 'gray';
    }
  };

  // 모달이 닫혀있으면 렌더링하지 않음
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        width: '600px',
        maxWidth: '90vw',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Study Memo</h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>

        {/* Orthanc 상태 표시 */}
        <div style={{ 
          marginBottom: '15px', 
          padding: '10px', 
          backgroundColor: orthancStatus === 'connected' ? '#e8f5e8' : '#fff3cd',
          border: `1px solid ${orthancStatus === 'connected' ? '#28a745' : '#ffc107'}`,
          borderRadius: '4px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {orthancStatus === 'checking' && (
              <div style={{ 
                width: '16px', 
                height: '16px', 
                border: '2px solid #ccc', 
                borderTop: '2px solid #333', 
                borderRadius: '50%', 
                animation: 'spin 1s linear infinite' 
              }} />
            )}
            <span style={{ color: getOrthancStatusColor(), fontWeight: 'bold' }}>
              {getOrthancStatusText()}
            </span>
          </div>
          {orthancStatus === 'disconnected' && (
            <div style={{ fontSize: '12px', marginTop: '5px', color: '#856404' }}>
              Orthanc 서버에 연결할 수 없어 로컬 스토리지에 백업됩니다.
            </div>
          )}
        </div>

        {/* 불러오기 상태 */}
        {loadResult && (
          <div style={{ 
            marginBottom: '10px',
            padding: '8px',
            backgroundColor: '#f8f9fa',
            borderRadius: '4px',
            border: '1px solid #dee2e6'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              fontSize: '14px'
            }}>
              {/* 소스 아이콘 */}
              <span style={{ 
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: loadResult.source === 'orthanc' ? '#28a745' : 
                                loadResult.source === 'local' ? '#ffc107' : '#6c757d'
              }}></span>
              
              {/* 소스 메시지 */}
              <span style={{ 
                color: loadResult.source === 'orthanc' ? '#28a745' : 
                       loadResult.source === 'local' ? '#856404' : '#6c757d',
                fontStyle: 'italic'
              }}>
                {loadSourceMessage}
              </span>
            </div>
          </div>
        )}

        {/* 메모 입력 영역 */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Study Memo:
          </label>
          <textarea
            value={memo || ''}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="Study에 대한 메모를 입력하세요..."
            rows={8}
            disabled={isLoading}
            style={{ 
              width: '100%', 
              resize: 'vertical',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>

        {/* 저장 결과 표시 */}
        {saveResult && (
          <div style={{
            marginBottom: '15px',
            padding: '10px',
            backgroundColor: saveResult.success ? '#d4edda' : '#f8d7da',
            border: `1px solid ${saveResult.success ? '#c3e6cb' : '#f5c6cb'}`,
            borderRadius: '4px',
            color: saveResult.success ? '#155724' : '#721c24'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ 
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: saveResult.success ? '#28a745' : '#dc3545'
              }}></span>
              <span style={{ fontSize: '14px', fontWeight: '500' }}>
                {saveResult.message}
              </span>
            </div>
          </div>
        )}

        {/* 기존 메시지 표시 */}
        {message && (
          <div style={{
            marginBottom: '15px',
            padding: '10px',
            backgroundColor: message.type === 'success' ? '#d4edda' : 
                           message.type === 'warning' ? '#fff3cd' : '#f8d7da',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : 
                                message.type === 'warning' ? '#ffeaa7' : '#f5c6cb'}`,
            borderRadius: '4px',
            color: message.type === 'success' ? '#155724' : 
                  message.type === 'warning' ? '#856404' : '#721c24'
          }}>
            {message.text}
          </div>
        )}

        {/* 버튼 영역 */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={handleDelete}
            disabled={isLoading || isSaving || isDeleting}
            style={{
              padding: '8px 16px',
              border: '1px solid #dc3545',
              borderRadius: '4px',
              backgroundColor: '#dc3545',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {isDeleting ? (
              <>
                <div style={{ 
                  display: 'inline-block',
                  width: '12px', 
                  height: '12px', 
                  border: '2px solid #fff', 
                  borderTop: '2px solid transparent', 
                  borderRadius: '50%', 
                  animation: 'spin 1s linear infinite',
                  marginRight: '5px'
                }} />
                삭제 중...
              </>
            ) : (
              '메모 삭제'
            )}
          </button>
          <button
            onClick={handleClose}
            disabled={isLoading || isSaving || isDeleting}
            style={{
              padding: '8px 16px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              backgroundColor: '#f8f9fa',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || isSaving || isDeleting || !memo.trim()}
            style={{
              padding: '8px 16px',
              border: '1px solid #007bff',
              borderRadius: '4px',
              backgroundColor: '#007bff',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {isSaving ? (
              <>
                <div style={{ 
                  display: 'inline-block',
                  width: '12px', 
                  height: '12px', 
                  border: '2px solid #fff', 
                  borderTop: '2px solid transparent', 
                  borderRadius: '50%', 
                  animation: 'spin 1s linear infinite',
                  marginRight: '5px'
                }} />
                저장 중...
              </>
            ) : (
              'Orthanc에 저장'
            )}
          </button>
        </div>

        {/* 디버그 정보 */}
        <div style={{ 
          marginTop: '20px', 
          padding: '10px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '4px',
          fontSize: '12px',
          color: '#6c757d'
        }}>
          <strong>디버그 정보:</strong>
          <br />
          • Study Instance UID: {studyInstanceUID || 'N/A'}
          <br />
          • 저장 방식: {orthancStatus === 'connected' ? 'Orthanc DICOM SR' : '로컬 백업'}
          <br />
          • 메모 길이: {(memo || '').length} 문자
        </div>
      </div>
    </div>
  );
};

export default StudyMemoModal; 