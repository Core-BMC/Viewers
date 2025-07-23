import React, { useState } from 'react';
import { StudyMemoService } from '../../services/StudyMemoService';
import { OrthancService } from '../../services/OrthancService';

const StudyMemoTestPage: React.FC = () => {
  const [testStudyUID, setTestStudyUID] = useState('1.2.826.0.1.3680043.2.135.1.20231201123456789.123456789');
  const [testMemo, setTestMemo] = useState('테스트 메모입니다. 이 메모는 Orthanc DICOM SR로 저장됩니다.');
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [orthancStatus, setOrthancStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  // 안전한 서비스 초기화
  const [memoService] = useState(() => new StudyMemoService());
  const [orthancService] = useState(() => new OrthancService({
    baseUrl: '/dicomweb', // 프록시를 통해 접근
    username: 'test',
    password: 'test'
  }));

  const testOrthancConnection = async () => {
    setIsLoading(true);
    setResult('Orthanc 서버 연결 테스트 중...');
    
    try {
      const isConnected = await orthancService.testConnection();
      setOrthancStatus(isConnected ? 'connected' : 'disconnected');
      setResult(isConnected ? '✅ Orthanc 서버 연결 성공!' : '❌ Orthanc 서버 연결 실패');
    } catch (error) {
      setOrthancStatus('disconnected');
      setResult(`❌ Orthanc 서버 연결 오류: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testSaveMemo = async () => {
    if (!testStudyUID.trim() || !testMemo.trim()) {
      setResult('❌ Study UID와 메모를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setResult('메모 저장 중...');
    
    try {
      await memoService.saveMemo(testStudyUID, testMemo);
      setResult('✅ 메모가 Orthanc DICOM SR로 저장되었습니다!');
    } catch (error) {
      setResult(`❌ 메모 저장 실패: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testLoadMemo = async () => {
    if (!testStudyUID.trim()) {
      setResult('❌ Study UID를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setResult('메모 불러오는 중...');
    
    try {
      const loadedMemo = await memoService.loadMemo(testStudyUID);
      if (loadedMemo) {
        setResult(`✅ 메모 불러오기 성공!\n\n내용:\n${loadedMemo}`);
        setTestMemo(loadedMemo);
      } else {
        setResult('ℹ️ 저장된 메모가 없습니다.');
      }
    } catch (error) {
      setResult(`❌ 메모 불러오기 실패: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testHasMemo = async () => {
    if (!testStudyUID.trim()) {
      setResult('❌ Study UID를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setResult('메모 존재 여부 확인 중...');
    
    try {
      const hasMemo = await memoService.hasMemo(testStudyUID);
      setResult(hasMemo ? '✅ 해당 Study에 메모가 있습니다.' : 'ℹ️ 해당 Study에 메모가 없습니다.');
    } catch (error) {
      setResult(`❌ 메모 확인 실패: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testDeleteMemo = async () => {
    if (!testStudyUID.trim()) {
      setResult('❌ Study UID를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setResult('메모 삭제 중...');
    
    try {
      await memoService.deleteMemo(testStudyUID);
      setResult('✅ 메모가 삭제되었습니다.');
    } catch (error) {
      setResult(`❌ 메모 삭제 실패: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllMemos = () => {
    memoService.clearAllMemos();
    setResult('✅ 모든 로컬 백업 메모가 삭제되었습니다.');
  };

  const getOrthancStatusText = () => {
    switch (orthancStatus) {
      case 'checking':
        return '확인 중...';
      case 'connected':
        return '연결됨';
      case 'disconnected':
        return '연결 안됨';
      default:
        return '';
    }
  };

  const getOrthancStatusColor = () => {
    switch (orthancStatus) {
      case 'connected':
        return '#28a745';
      case 'disconnected':
        return '#dc3545';
      default:
        return '#ffc107';
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ color: '#333', marginBottom: '20px' }}>Study Memo 테스트 페이지</h1>
      
      {/* Orthanc 상태 표시 */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '15px', 
        backgroundColor: orthancStatus === 'connected' ? '#d4edda' : '#f8d7da',
        border: `1px solid ${orthancStatus === 'connected' ? '#c3e6cb' : '#f5c6cb'}`,
        borderRadius: '4px'
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: getOrthancStatusColor() }}>
          Orthanc 서버 상태: {getOrthancStatusText()}
        </h3>
        <button
          onClick={testOrthancConnection}
          disabled={isLoading}
          style={{
            padding: '8px 16px',
            border: '1px solid #007bff',
            borderRadius: '4px',
            backgroundColor: '#007bff',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          {isLoading ? '테스트 중...' : '연결 테스트'}
        </button>
      </div>

      {/* 입력 필드들 */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Test Study Instance UID:
          </label>
          <input
            type="text"
            value={testStudyUID || ''}
            onChange={(e) => setTestStudyUID(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px'
            }}
            placeholder="Study Instance UID를 입력하세요"
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Test Memo:
          </label>
          <textarea
            value={testMemo || ''}
            onChange={(e) => setTestMemo(e.target.value)}
            rows={4}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
              resize: 'vertical'
            }}
            placeholder="테스트할 메모를 입력하세요"
          />
        </div>
      </div>

      {/* 테스트 버튼들 */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '10px' }}>기능 테스트:</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={testSaveMemo}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              border: '1px solid #28a745',
              borderRadius: '4px',
              backgroundColor: '#28a745',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            {isLoading ? '저장 중...' : '메모 저장'}
          </button>

          <button
            onClick={testLoadMemo}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              border: '1px solid #007bff',
              borderRadius: '4px',
              backgroundColor: '#007bff',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            {isLoading ? '불러오는 중...' : '메모 불러오기'}
          </button>

          <button
            onClick={testHasMemo}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              border: '1px solid #ffc107',
              borderRadius: '4px',
              backgroundColor: '#ffc107',
              color: '#212529',
              cursor: 'pointer'
            }}
          >
            {isLoading ? '확인 중...' : '메모 존재 확인'}
          </button>

          <button
            onClick={testDeleteMemo}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              border: '1px solid #dc3545',
              borderRadius: '4px',
              backgroundColor: '#dc3545',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            {isLoading ? '삭제 중...' : '메모 삭제'}
          </button>

          <button
            onClick={clearAllMemos}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              border: '1px solid #6c757d',
              borderRadius: '4px',
              backgroundColor: '#6c757d',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            모든 로컬 메모 삭제
          </button>
        </div>
      </div>

      {/* 결과 표시 */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '10px' }}>테스트 결과:</h3>
        <div style={{
          padding: '15px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          minHeight: '100px',
          whiteSpace: 'pre-wrap',
          fontFamily: 'monospace',
          fontSize: '14px'
        }}>
          {result || '테스트를 실행하면 결과가 여기에 표시됩니다.'}
        </div>
      </div>

      {/* 기능 설명 */}
      <div style={{
        padding: '15px',
        backgroundColor: '#e7f3ff',
        border: '1px solid #b3d9ff',
        borderRadius: '4px'
      }}>
        <h3 style={{ marginBottom: '10px' }}>기능 설명:</h3>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>• Orthanc DICOM SR 저장: 메모를 DICOM SR 형태로 Orthanc에 저장</li>
          <li>• 로컬 백업: Orthanc 연결 실패 시 로컬 스토리지에 백업</li>
          <li>• Study 연결: Study Instance UID와 메모를 연결</li>
          <li>• Orthanc REST API: Orthanc 서버와 REST API로 통신</li>
          <li>• DICOM SR 생성: 표준 DICOM SR 구조로 메모 생성</li>
          <li>• 서버 재시작 후에도 메모 유지</li>
          <li>• Orthanc 서버 URL: http://localhost:8042</li>
        </ul>
      </div>
    </div>
  );
};

export default StudyMemoTestPage; 