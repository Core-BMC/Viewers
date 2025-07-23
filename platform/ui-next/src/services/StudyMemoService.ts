import { OrthancService, type OrthancConfig } from './OrthancService';

interface StudyMemoSR {
  studyInstanceUID: string;
  memo: string;
  createdAt: string;
  updatedAt: string;
}

interface SaveResult {
  success: boolean;
  orthancSaved: boolean;
  localBackupSaved: boolean;
  message: string;
}

interface LoadResult {
  memo: string | null;
  source: 'orthanc' | 'local' | 'not_found';
  message: string;
}

class StudyMemoService {
  private orthancService: OrthancService;
  private storageKey = 'ohif_study_memos'; // 로컬 백업용

  constructor(orthancConfig?: OrthancConfig) {
    // Orthanc 설정이 없으면 기본값 사용 (프록시를 통해 접근)
    const config = orthancConfig || {
      baseUrl: '/dicomweb', // 프록시를 통해 접근
      username: 'test',
      password: 'test'
    };
    
    this.orthancService = new OrthancService(config);
    
    // 로컬 스토리지 초기화 (백업용)
    if (!localStorage.getItem(this.storageKey)) {
      localStorage.setItem(this.storageKey, JSON.stringify({}));
    }
  }

  /**
   * Orthanc 서버 연결 테스트
   */
  async testOrthancConnection(): Promise<boolean> {
    return await this.orthancService.testConnection();
  }

  /**
   * Study Memo를 DICOM 파일에 직접 저장
   */
  async saveMemo(studyInstanceUID: string, memo: string): Promise<SaveResult> {
    let orthancSaved = false;
    let localBackupSaved = false;
    let message = '';

    try {
      // 1. Orthanc 연결 테스트
      const isConnected = await this.testOrthancConnection();
      console.log('🔌 Orthanc 연결 상태:', isConnected);

      if (isConnected) {
        try {
          // 2. Orthanc 메타데이터에 저장 시도
          console.log('💾 Orthanc 메타데이터에 저장 시도...');
          const result = await this.orthancService.uploadSR(studyInstanceUID, memo);
          
          if (result === 'success') {
            orthancSaved = true;
            message = 'Orthanc 서버에 저장되었습니다.';
            console.log('✅ Orthanc 저장 성공');
            
            // Orthanc 저장 성공 시 로컬 백업 불필요
            return {
              success: true,
              orthancSaved: true,
              localBackupSaved: false,
              message
            };
          }
        } catch (orthancError) {
          console.error('❌ Orthanc 저장 실패:', orthancError);
          message = 'Orthanc 저장에 실패했습니다. 로컬 백업으로 저장합니다.';
        }
      } else {
        message = 'Orthanc 서버에 연결할 수 없습니다. 로컬 백업으로 저장합니다.';
      }

      // 3. Orthanc 저장 실패 시에만 로컬 백업 저장
      console.log('💾 로컬 백업에 저장 시도...');
      await this.saveLocalBackup(studyInstanceUID, memo);
      localBackupSaved = true;
      console.log('✅ 로컬 백업 저장 성공');

      return {
        success: true,
        orthancSaved: false,
        localBackupSaved: true,
        message
      };

    } catch (error) {
      console.error('❌ 메모 저장 중 오류:', error);
      
      return {
        success: false,
        orthancSaved: false,
        localBackupSaved: false,
        message: `저장 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      };
    }
  }

  /**
   * Study Memo를 DICOM 파일에서 불러오기
   */
  async loadMemo(studyInstanceUID: string): Promise<LoadResult> {
    console.log('🔍 loadMemo 시작:', studyInstanceUID);
    
    try {
      // 1. Orthanc 연결 테스트
      const isConnected = await this.testOrthancConnection();
      console.log('🔌 Orthanc 연결 상태:', isConnected);
      
      if (!isConnected) {
        console.log('❌ Orthanc not connected, loading from local backup...');
        const localMemo = await this.loadLocalBackup(studyInstanceUID);
        const result = {
          memo: localMemo,
          source: 'local' as const,
          message: localMemo ? '로컬 백업에서 메모를 불러왔습니다.' : '로컬 백업에 메모가 없습니다.'
        };
        console.log('📋 로컬 백업 결과:', result);
        return result;
      }

      // 2. 먼저 메타데이터에서 메모 불러오기 (저장 방식과 일관성)
      console.log('🔍 메타데이터에서 메모 찾는 중...');
      const metadataMemo = await this.orthancService.downloadSR(studyInstanceUID);
      if (metadataMemo) {
        console.log('✅ Memo loaded from Orthanc metadata:', metadataMemo);
        const result = {
          memo: metadataMemo,
          source: 'orthanc' as const,
          message: 'Orthanc 메타데이터에서 메모를 불러왔습니다.'
        };
        console.log('📋 메타데이터 결과:', result);
        return result;
      }

      // 3. 메타데이터에서 없으면 DICOM 파일에서 시도
      console.log('🔍 DICOM 파일에서 메모 찾는 중...');
      const dicomMemo = await this.orthancService.loadMemoFromDicomFile(studyInstanceUID);
      if (dicomMemo) {
        console.log('✅ Memo loaded from DICOM file:', dicomMemo);
        const result = {
          memo: dicomMemo,
          source: 'orthanc' as const,
          message: 'DICOM 파일에서 메모를 불러왔습니다.'
        };
        console.log('📋 DICOM 파일 결과:', result);
        return result;
      }

      // 4. 둘 다 없으면 로컬 백업에서 시도
      console.log('🔍 No memo found in Orthanc, trying local backup...');
      const localMemo = await this.loadLocalBackup(studyInstanceUID);
      const result = {
        memo: localMemo,
        source: 'local' as const,
        message: localMemo ? '로컬 백업에서 메모를 불러왔습니다.' : '로컬 백업에 메모가 없습니다.'
      };
      console.log('📋 로컬 백업 결과:', result);
      return result;

    } catch (error) {
      console.error('❌ Error loading study memo:', error);
      
      // 오류 발생 시 로컬 백업에서 시도
      try {
        console.log('🔍 오류 발생, 로컬 백업에서 시도...');
        const localMemo = await this.loadLocalBackup(studyInstanceUID);
        const result = {
          memo: localMemo,
          source: 'local' as const,
          message: localMemo ? '로컬 백업에서 메모를 불러왔습니다.' : '로컬 백업에 메모가 없습니다.'
        };
        console.log('📋 오류 시 로컬 백업 결과:', result);
        return result;
      } catch (backupError) {
        console.error('❌ Error loading local backup:', backupError);
        const result = {
          memo: null,
          source: 'not_found' as const,
          message: '메모를 찾을 수 없습니다.'
        };
        console.log('📋 최종 결과 (메모 없음):', result);
        return result;
      }
    }
  }

  /**
   * Study에 메모가 있는지 확인
   */
  async hasMemo(studyInstanceUID: string): Promise<boolean> {
    try {
      const result = await this.loadMemo(studyInstanceUID);
      return result.memo !== null && result.memo.trim() !== '';
    } catch (error) {
      console.error('Error checking memo existence:', error);
      return false;
    }
  }

  /**
   * Study Memo를 DICOM 파일에서 삭제
   */
  async deleteMemo(studyInstanceUID: string): Promise<void> {
    try {
      // 1. Orthanc 연결 테스트
      const isConnected = await this.testOrthancConnection();
      if (isConnected) {
        // 2. 먼저 메타데이터에서 삭제 (저장 방식과 일관성)
        try {
          const deleteSuccess = await this.orthancService.deleteSR(studyInstanceUID);
          if (deleteSuccess) {
            console.log('✅ Memo deleted from Orthanc metadata');
          } else {
            console.warn('⚠️ Failed to delete memo from Orthanc metadata');
          }
        } catch (metadataError) {
          console.error('❌ Error deleting from metadata:', metadataError);
        }

        // 3. DICOM 파일에서도 삭제 시도 (혹시 있을 수 있는 기존 메모)
        try {
          const dicomSuccess = await this.orthancService.removeMemoFromDicomFile(studyInstanceUID);
          if (dicomSuccess) {
            console.log('✅ Memo removed from DICOM file');
          } else {
            console.warn('⚠️ Failed to remove memo from DICOM file');
          }
        } catch (dicomError) {
          console.error('❌ Error removing from DICOM file:', dicomError);
        }
      }

      // 4. 로컬 백업에서도 삭제
      await this.deleteLocalBackup(studyInstanceUID);
      console.log('✅ Memo deleted from local backup');

    } catch (error) {
      console.error('❌ Error deleting study memo:', error);
      
      // 오류 발생 시에도 로컬 백업은 삭제 시도
      try {
        await this.deleteLocalBackup(studyInstanceUID);
      } catch (backupError) {
        console.error('❌ Error deleting local backup:', backupError);
      }
      
      throw error;
    }
  }

  /**
   * 로컬 백업에 메모 저장
   */
  private async saveLocalBackup(studyInstanceUID: string, memo: string): Promise<void> {
    try {
      console.log('💾 로컬 백업 저장 시작:', { studyInstanceUID, memo });
      
      const memos = this.getMemosFromStorage();
      console.log('📋 기존 로컬 메모:', memos);
      
      memos[studyInstanceUID] = {
        studyInstanceUID,
        memo,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      localStorage.setItem(this.storageKey, JSON.stringify(memos));
      console.log('✅ 로컬 백업 저장 완료:', memos[studyInstanceUID]);
      
      // 저장 후 확인
      const savedMemos = this.getMemosFromStorage();
      console.log('✅ 저장 후 확인:', savedMemos[studyInstanceUID]);
      
    } catch (error) {
      console.error('❌ 로컬 백업 저장 오류:', error);
      throw error;
    }
  }

  /**
   * 로컬 백업에서 메모 불러오기 (외부 접근용)
   */
  async loadLocalBackupOnly(studyInstanceUID: string): Promise<string | null> {
    console.log('🔍 loadLocalBackupOnly 호출:', studyInstanceUID);
    const result = await this.loadLocalBackup(studyInstanceUID);
    console.log('📋 로컬 백업 결과:', result);
    return result;
  }

  /**
   * 로컬 백업에서 메모 불러오기
   */
  private async loadLocalBackup(studyInstanceUID: string): Promise<string | null> {
    try {
      console.log('🔍 loadLocalBackup 시작:', studyInstanceUID);
      
      const memos = this.getMemosFromStorage();
      console.log('📋 저장된 모든 메모:', memos);
      
      const memo = memos[studyInstanceUID];
      if (memo) {
        console.log('✅ 로컬 백업에서 메모 찾음:', memo);
        return memo.memo;
      }
      
      console.log('❌ 로컬 백업에 메모 없음');
      return null;
    } catch (error) {
      console.error('❌ 로컬 백업 불러오기 오류:', error);
      return null;
    }
  }

  /**
   * 로컬 백업 삭제
   */
  private async deleteLocalBackup(studyInstanceUID: string): Promise<void> {
    try {
      const memos = this.getMemosFromStorage();
      delete memos[studyInstanceUID];
      localStorage.setItem(this.storageKey, JSON.stringify(memos));
      console.log('Study memo deleted from local backup');
    } catch (error) {
      console.error('Error deleting from local backup:', error);
      throw error;
    }
  }

  /**
   * 로컬 스토리지에서 메모 목록 가져오기
   */
  private getMemosFromStorage(): Record<string, StudyMemoSR> {
    try {
      console.log('📋 localStorage 키:', this.storageKey);
      
      const stored = localStorage.getItem(this.storageKey);
      console.log('📋 localStorage 원본 데이터:', stored);
      
      if (!stored) {
        console.log('📋 localStorage 비어있음, 빈 객체 반환');
        return {};
      }
      
      const parsed = JSON.parse(stored);
      console.log('📋 파싱된 메모 데이터:', parsed);
      
      return parsed;
    } catch (error) {
      console.error('❌ localStorage 읽기 오류:', error);
      return {};
    }
  }

  /**
   * 모든 메모 삭제 (테스트용)
   */
  clearAllMemos(): void {
    localStorage.removeItem(this.storageKey);
    console.log('All study memos cleared from local backup');
  }

  /**
   * Orthanc 서비스 인스턴스 반환 (디버깅용)
   */
  getOrthancService(): OrthancService {
    return this.orthancService;
  }
}

export { StudyMemoService };
export type { StudyMemoSR, LoadResult }; 