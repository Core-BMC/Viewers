interface OrthancConfig {
  baseUrl: string;
  username?: string;
  password?: string;
}

interface DICOMSRData {
  studyInstanceUID: string;
  memo: string;
  createdAt: string;
  updatedAt: string;
}

class OrthancService {
  private config: OrthancConfig;

  constructor(config: OrthancConfig) {
    this.config = config;
  }

  /**
   * Orthanc 서버 연결 테스트
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch('/dicomweb/studies', {
        method: 'GET',
        headers: this.getHeaders(),
      });
      
      if (response.ok) {
        console.log('Orthanc connection successful:', await response.json());
        return true;
      } else {
        console.error('Orthanc connection failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Orthanc connection error:', error);
      return false;
    }
  }

  /**
   * Study 정보 조회
   */
  async getStudy(studyInstanceUID: string): Promise<any> {
    try {
      const response = await fetch(`/dicomweb/studies/${studyInstanceUID}`, {
        method: 'GET',
        headers: {
          ...this.getHeaders(),
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        return await response.json();
      } else {
        console.warn(`Failed to get study details: ${response.status}, proceeding with SR creation`);
        return {
          StudyInstanceUID: studyInstanceUID,
          PatientName: 'Unknown',
          StudyDate: new Date().toISOString().slice(0, 8).replace(/-/g, ''),
          StudyDescription: 'Study Memo',
        };
      }
    } catch (error) {
      console.error('Error getting study:', error);
      return {
        StudyInstanceUID: studyInstanceUID,
        PatientName: 'Unknown',
        StudyDate: new Date().toISOString().slice(0, 8).replace(/-/g, ''),
        StudyDescription: 'Study Memo',
      };
    }
  }

  /**
   * 메모를 Orthanc에 저장
   */
  async uploadSR(studyInstanceUID: string, memo: string): Promise<string> {
    try {
      console.log('🔍 uploadSR 시작:', { studyInstanceUID, memo });
      
      // 1. Study ID 조회
      const studyResponse = await fetch(`/orthanc/studies`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      console.log('📋 Studies 조회 응답:', studyResponse.status);

      if (!studyResponse.ok) {
        throw new Error(`Failed to get studies: ${studyResponse.status}`);
      }

      const studies = await studyResponse.json();
      console.log('📋 Studies 목록:', studies);
      
      let orthancStudyId = null;

      // Study Instance UID로 Orthanc Study ID 찾기
      for (const studyId of studies) {
        console.log('🔍 Study 상세 조회:', studyId);
        
        const detailResponse = await fetch(`/orthanc/studies/${studyId}`, {
          method: 'GET',
          headers: this.getHeaders(),
        });

        if (detailResponse.ok) {
          const studyDetail = await detailResponse.json();
          console.log('📄 Study 상세 정보:', studyDetail.MainDicomTags.StudyInstanceUID);
          
          if (studyDetail.MainDicomTags.StudyInstanceUID === studyInstanceUID) {
            orthancStudyId = studyId;
            console.log('✅ Study ID 찾음:', orthancStudyId);
            break;
          }
        }
      }

      if (!orthancStudyId) {
        console.error('❌ Study not found for UID:', studyInstanceUID);
        throw new Error('Study not found');
      }

      // 2. Study에 메타데이터로 메모 저장
      const memoData = {
        memo: memo,
        createdAt: new Date().toISOString(),
        type: 'StudyMemo'
      };

      console.log('💾 메타데이터 저장 시도:', { orthancStudyId, memoData });

      const metadataResponse = await fetch(`/orthanc/studies/${orthancStudyId}/metadata/1025`, {
        method: 'PUT',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(memoData),
      });

      console.log('💾 메타데이터 저장 응답:', metadataResponse.status);

      if (metadataResponse.ok) {
        console.log('✅ Memo saved as metadata successfully');
        return 'success';
      } else {
        const errorText = await metadataResponse.text();
        console.error('❌ Metadata upload failed:', metadataResponse.status, errorText);
        throw new Error(`Metadata upload failed: ${metadataResponse.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Error uploading memo:', error);
      throw error;
    }
  }

  /**
   * 메모 다운로드
   */
  async downloadSR(studyInstanceUID: string): Promise<string | null> {
    try {
      // 1. Study ID 조회
      const studyResponse = await fetch(`/orthanc/studies`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!studyResponse.ok) {
        return null;
      }

      const studies = await studyResponse.json();
      let orthancStudyId = null;

      // Study Instance UID로 Orthanc Study ID 찾기
      for (const studyId of studies) {
        const detailResponse = await fetch(`/orthanc/studies/${studyId}`, {
          method: 'GET',
          headers: this.getHeaders(),
        });

        if (detailResponse.ok) {
          const studyDetail = await detailResponse.json();
          if (studyDetail.MainDicomTags.StudyInstanceUID === studyInstanceUID) {
            orthancStudyId = studyId;
            break;
          }
        }
      }

      if (!orthancStudyId) {
        return null;
      }

      // 2. Study 메타데이터에서 메모 조회
      const metadataResponse = await fetch(`/orthanc/studies/${orthancStudyId}/metadata/1025`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (metadataResponse.ok) {
        const metadataText = await metadataResponse.text();
        const memoData = JSON.parse(metadataText);
        return memoData.memo;
      }

      return null;
    } catch (error) {
      console.error('Error downloading memo:', error);
      return null;
    }
  }

  /**
   * 메모 삭제
   */
  async deleteSR(studyInstanceUID: string): Promise<boolean> {
    try {
      // 1. Study ID 조회
      const studyResponse = await fetch(`/orthanc/studies`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!studyResponse.ok) {
        return false;
      }

      const studies = await studyResponse.json();
      let orthancStudyId = null;

      // Study Instance UID로 Orthanc Study ID 찾기
      for (const studyId of studies) {
        const detailResponse = await fetch(`/orthanc/studies/${studyId}`, {
          method: 'GET',
          headers: this.getHeaders(),
        });

        if (detailResponse.ok) {
          const studyDetail = await detailResponse.json();
          if (studyDetail.MainDicomTags.StudyInstanceUID === studyInstanceUID) {
            orthancStudyId = studyId;
            break;
          }
        }
      }

      if (!orthancStudyId) {
        return false;
      }

      // 2. Study 메타데이터에서 메모 삭제
      const deleteResponse = await fetch(`/orthanc/studies/${orthancStudyId}/metadata/1025`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (deleteResponse.ok) {
        console.log('Memo metadata deleted successfully');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error deleting memo:', error);
      return false;
    }
  }

  /**
   * 기존 DICOM 파일에 메모를 직접 추가하여 저장
   */
  async addMemoToDicomFile(studyInstanceUID: string, memo: string): Promise<string> {
    try {
      // 1. Study ID 조회
      const studyResponse = await fetch(`/orthanc/studies`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!studyResponse.ok) {
        throw new Error(`Failed to get studies: ${studyResponse.status}`);
      }

      const studies = await studyResponse.json();
      let orthancStudyId = null;

      // Study Instance UID로 Orthanc Study ID 찾기
      for (const studyId of studies) {
        const detailResponse = await fetch(`/orthanc/studies/${studyId}`, {
          method: 'GET',
          headers: this.getHeaders(),
        });

        if (detailResponse.ok) {
          const studyDetail = await detailResponse.json();
          if (studyDetail.MainDicomTags.StudyInstanceUID === studyInstanceUID) {
            orthancStudyId = studyId;
            break;
          }
        }
      }

      if (!orthancStudyId) {
        throw new Error('Study not found');
      }

      // 2. Study의 첫 번째 Series와 Instance 찾기
      const studyDetail = await fetch(`/orthanc/studies/${orthancStudyId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!studyDetail.ok) {
        throw new Error('Failed to get study details');
      }

      const study = await studyDetail.json();
      const firstSeriesId = study.Series[0];

      const seriesDetail = await fetch(`/orthanc/series/${firstSeriesId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!seriesDetail.ok) {
        throw new Error('Failed to get series details');
      }

      const series = await seriesDetail.json();
      const firstInstanceId = series.Instances[0];

      // 3. 기존 DICOM 파일을 수정하여 메모 추가
      const modifyPayload = {
        Replace: {
          // Private Tags for memo storage
          "7777,0001": "OHIF_MEMO", // Private Creator
          "7777,1001": memo, // Memo content
          "7777,1002": new Date().toISOString(), // Created date
          "7777,1003": "1.0", // Version
          
          // Standard DICOM tags that can hold memo
          "0020,4000": `OHIF Memo: ${memo}`, // Image Comments
          "0008,4000": `Study memo added by OHIF: ${memo}`, // Identifying Comments
          
          // Study Description에 메모 표시 추가
          "0008,1030": (study.MainDicomTags.StudyDescription || "CT Study") + ` [Memo: ${memo.substring(0, 50)}${memo.length > 50 ? '...' : ''}]`
        }
      };

      // 4. 수정된 DICOM 인스턴스 생성
      const modifyResponse = await fetch(`/orthanc/instances/${firstInstanceId}/modify`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modifyPayload),
      });

      if (!modifyResponse.ok) {
        const errorText = await modifyResponse.text();
        throw new Error(`Failed to modify DICOM instance: ${modifyResponse.status} - ${errorText}`);
      }

      const modifiedInstanceId = await modifyResponse.text();
      console.log('✅ DICOM 파일에 메모가 추가되었습니다:', modifiedInstanceId);

      // 5. 원본 인스턴스 삭제 (선택사항)
      // await fetch(`/orthanc/instances/${firstInstanceId}`, {
      //   method: 'DELETE',
      //   headers: this.getHeaders(),
      // });

      return modifiedInstanceId;

    } catch (error) {
      console.error('Error adding memo to DICOM file:', error);
      throw error;
    }
  }

  /**
   * DICOM 파일에서 메모 불러오기
   */
  async loadMemoFromDicomFile(studyInstanceUID: string): Promise<string | null> {
    try {
      // 1. Study ID 조회
      const studyResponse = await fetch(`/orthanc/studies`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!studyResponse.ok) {
        return null;
      }

      const studies = await studyResponse.json();
      let orthancStudyId = null;

      for (const studyId of studies) {
        const detailResponse = await fetch(`/orthanc/studies/${studyId}`, {
          method: 'GET',
          headers: this.getHeaders(),
        });

        if (detailResponse.ok) {
          const studyDetail = await detailResponse.json();
          if (studyDetail.MainDicomTags.StudyInstanceUID === studyInstanceUID) {
            orthancStudyId = studyId;
            break;
          }
        }
      }

      if (!orthancStudyId) {
        return null;
      }

      // 2. Study의 모든 Series와 Instance 확인
      const studyDetail = await fetch(`/orthanc/studies/${orthancStudyId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!studyDetail.ok) {
        return null;
      }

      const study = await studyDetail.json();

      // 3. 각 Series의 Instance들에서 메모 찾기
      for (const seriesId of study.Series) {
        const seriesDetail = await fetch(`/orthanc/series/${seriesId}`, {
          method: 'GET',
          headers: this.getHeaders(),
        });

        if (!seriesDetail.ok) {
          continue;
        }

        const series = await seriesDetail.json();

        for (const instanceId of series.Instances) {
          const tagsResponse = await fetch(`/orthanc/instances/${instanceId}/tags`, {
            method: 'GET',
            headers: this.getHeaders(),
          });

          if (!tagsResponse.ok) {
            continue;
          }

          const tags = await tagsResponse.json();

          // Private Tag에서 메모 확인
          if (tags["7777,1001"] && tags["7777,1001"].Value) {
            console.log('✅ DICOM 파일에서 메모를 찾았습니다:', tags["7777,1001"].Value);
            return tags["7777,1001"].Value;
          }

          // Image Comments에서 메모 확인 (백업)
          if (tags["0020,4000"] && tags["0020,4000"].Value) {
            const imageComments = tags["0020,4000"].Value;
            if (imageComments.startsWith("OHIF Memo: ")) {
              const memo = imageComments.replace("OHIF Memo: ", "");
              console.log('✅ Image Comments에서 메모를 찾았습니다:', memo);
              return memo;
            }
          }
        }
      }

      return null;

    } catch (error) {
      console.error('Error loading memo from DICOM file:', error);
      return null;
    }
  }

  /**
   * DICOM 파일에서 메모 삭제
   */
  async removeMemoFromDicomFile(studyInstanceUID: string): Promise<boolean> {
    try {
      // 1. Study ID 조회
      const studyResponse = await fetch(`/orthanc/studies`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!studyResponse.ok) {
        return false;
      }

      const studies = await studyResponse.json();
      let orthancStudyId = null;

      for (const studyId of studies) {
        const detailResponse = await fetch(`/orthanc/studies/${studyId}`, {
          method: 'GET',
          headers: this.getHeaders(),
        });

        if (detailResponse.ok) {
          const studyDetail = await detailResponse.json();
          if (studyDetail.MainDicomTags.StudyInstanceUID === studyInstanceUID) {
            orthancStudyId = studyId;
            break;
          }
        }
      }

      if (!orthancStudyId) {
        return false;
      }

      // 2. 메모가 있는 Instance 찾기 및 수정
      const studyDetail = await fetch(`/orthanc/studies/${orthancStudyId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!studyDetail.ok) {
        return false;
      }

      const study = await studyDetail.json();

      for (const seriesId of study.Series) {
        const seriesDetail = await fetch(`/orthanc/series/${seriesId}`, {
          method: 'GET',
          headers: this.getHeaders(),
        });

        if (!seriesDetail.ok) {
          continue;
        }

        const series = await seriesDetail.json();

        for (const instanceId of series.Instances) {
          const tagsResponse = await fetch(`/orthanc/instances/${instanceId}/tags`, {
            method: 'GET',
            headers: this.getHeaders(),
          });

          if (!tagsResponse.ok) {
            continue;
          }

          const tags = await tagsResponse.json();

          // 메모가 있는 Instance인지 확인
          if (tags["7777,1001"] && tags["7777,1001"].Value) {
            // 메모 관련 태그들 제거
            const modifyPayload = {
              Remove: [
                "7777,0001", // Private Creator
                "7777,1001", // Memo content
                "7777,1002", // Created date
                "7777,1003", // Version
                "0020,4000", // Image Comments
                "0008,4000"  // Identifying Comments
              ],
              Replace: {
                // Study Description에서 메모 부분 제거
                "0008,1030": (study.MainDicomTags.StudyDescription || "CT Study").replace(/ \[Memo:.*?\]$/, "")
              }
            };

            const modifyResponse = await fetch(`/orthanc/instances/${instanceId}/modify`, {
              method: 'POST',
              headers: {
                ...this.getHeaders(),
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(modifyPayload),
            });

            if (modifyResponse.ok) {
              console.log('✅ DICOM 파일에서 메모가 삭제되었습니다');
              return true;
            }
          }
        }
      }

      return false;

    } catch (error) {
      console.error('Error removing memo from DICOM file:', error);
      return false;
    }
  }

  /**
   * DICOM SR 생성
   */
  private async createDICOMSR(studyInstanceUID: string, memo: string, study: any): Promise<ArrayBuffer> {
    // DICOM SR 메타데이터
    const srData = {
      StudyInstanceUID: studyInstanceUID,
      SeriesInstanceUID: this.generateUID(),
      SopInstanceUID: this.generateUID(),
      SopClassUid: '1.2.840.10008.5.1.4.1.1.88.11', // Comprehensive SR
      Modality: 'SR',
      SeriesDescription: 'Study Memo',
      ContentDate: new Date().toISOString().slice(0, 8).replace(/-/g, ''),
      ContentTime: new Date().toTimeString().slice(0, 6).replace(/:/g, ''),
      Memo: memo,
      CreatedAt: new Date().toISOString(),
    };

    // DICOM SR 바이너리 데이터 생성
    return this.createDICOMSRBuffer(srData);
  }

  /**
   * DICOM SR 바이너리 버퍼 생성
   */
  private createDICOMSRBuffer(srData: any): ArrayBuffer {
    const encoder = new TextEncoder();
    
    // DICOM 파일 헤더 (128바이트 + DICM)
    const preamble = new Uint8Array(128);
    const dicom = encoder.encode('DICM');
    
    // DICOM 데이터셋 (Little Endian Explicit VR)
    const dataset = this.createDICOMDataset(srData);
    
    // 전체 버퍼 생성
    const totalLength = preamble.length + dicom.length + dataset.length;
    const buffer = new ArrayBuffer(totalLength);
    const view = new Uint8Array(buffer);
    
    view.set(preamble, 0);
    view.set(dicom, preamble.length);
    view.set(dataset, preamble.length + dicom.length);
    
    return buffer;
  }

  /**
   * DICOM 데이터셋 생성 (Little Endian Explicit VR)
   */
  private createDICOMDataset(srData: any): Uint8Array {
    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [];
    
    // DICOM 태그들 (Little Endian Explicit VR) - SR 표준에 맞게 정렬
    const tags = [
      { tag: '00080005', vr: 'CS', value: 'ISO_IR 100' }, // Specific Character Set
      { tag: '00080008', vr: 'CS', value: 'ORIGINAL' }, // Image Type
      { tag: '00080012', vr: 'DA', value: srData.ContentDate }, // Instance Creation Date
      { tag: '00080013', vr: 'TM', value: srData.ContentTime }, // Instance Creation Time
      { tag: '00080014', vr: 'UI', value: '1.2.826.0.1.3680043.2.135.1' }, // Instance Creator UID
      { tag: '00080016', vr: 'UI', value: srData.SopClassUid }, // SOP Class UID
      { tag: '00080018', vr: 'UI', value: srData.SopInstanceUID }, // SOP Instance UID
      { tag: '00080020', vr: 'DA', value: srData.ContentDate }, // Study Date
      { tag: '00080030', vr: 'TM', value: srData.ContentTime }, // Study Time
      { tag: '00080050', vr: 'SH', value: 'STUDY' }, // Accession Number
      { tag: '00080060', vr: 'CS', value: srData.Modality }, // Modality
      { tag: '00080090', vr: 'PN', value: 'Unknown' }, // Referring Physician's Name
      { tag: '0008103E', vr: 'LO', value: srData.SeriesDescription }, // Series Description
      { tag: '00100010', vr: 'PN', value: 'Unknown' }, // Patient's Name
      { tag: '00100020', vr: 'LO', value: 'UNKNOWN' }, // Patient ID
      { tag: '00100030', vr: 'DA', value: '19000101' }, // Patient's Birth Date
      { tag: '00100040', vr: 'CS', value: 'O' }, // Patient's Sex
      { tag: '0020000D', vr: 'UI', value: srData.StudyInstanceUID }, // Study Instance UID
      { tag: '0020000E', vr: 'UI', value: srData.SeriesInstanceUID }, // Series Instance UID
      { tag: '00200010', vr: 'SH', value: 'STUDY' }, // Study ID
      { tag: '00200011', vr: 'IS', value: '1' }, // Series Number
      { tag: '00200013', vr: 'IS', value: '1' }, // Instance Number
      { tag: '00400001', vr: 'AE', value: 'OHIF' }, // Scheduled Station AE Title
      { tag: '00400002', vr: 'DA', value: srData.ContentDate }, // Scheduled Procedure Step Start Date
      { tag: '00400003', vr: 'TM', value: srData.ContentTime }, // Scheduled Procedure Step Start Time
      { tag: '00400006', vr: 'PN', value: 'Unknown' }, // Scheduled Performing Physician's Name
      { tag: '00400007', vr: 'LO', value: 'Study Memo' }, // Scheduled Procedure Step Description
      { tag: '00400009', vr: 'SH', value: 'STUDY' }, // Scheduled Procedure Step ID
      { tag: '00400010', vr: 'SH', value: 'STUDY' }, // Scheduled Station Name
      { tag: '00400011', vr: 'SH', value: 'STUDY' }, // Scheduled Procedure Step Location
      { tag: '00400012', vr: 'LO', value: 'Study Memo' }, // Pre-Medication
      { tag: '00400020', vr: 'CS', value: 'SCHEDULED' }, // Scheduled Procedure Step Status
      { tag: '00400031', vr: 'UT', value: srData.Memo }, // Study Memo Content
    ];

    for (const tag of tags) {
      // 태그를 4바이트로 변환 (Little Endian)
      const tagBytes = new Uint8Array(4);
      const tagValue = parseInt(tag.tag, 16);
      new DataView(tagBytes.buffer).setUint32(0, tagValue, true);
      
      // VR을 2바이트로 변환
      const vrBytes = encoder.encode(tag.vr);
      
      // 값 길이를 2바이트로 변환 (Little Endian)
      const valueBytes = encoder.encode(tag.value);
      const lengthBytes = new Uint8Array(2);
      new DataView(lengthBytes.buffer).setUint16(0, valueBytes.length, true);
      
      chunks.push(tagBytes);
      chunks.push(vrBytes);
      chunks.push(lengthBytes);
      chunks.push(valueBytes);
    }

    // 모든 청크 합치기
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result;
  }

  /**
   * 간단한 DICOM SR 생성
   */
  private createSimpleDICOMSR(studyInstanceUID: string, memo: string): ArrayBuffer {
    const encoder = new TextEncoder();
    
    // DICOM 파일 헤더 (128바이트 + DICM)
    const preamble = new Uint8Array(128);
    const dicom = encoder.encode('DICM');
    
    // 간단한 DICOM 데이터셋
    const dataset = this.createSimpleDICOMDataset(studyInstanceUID, memo);
    
    // 전체 버퍼 생성
    const totalLength = preamble.length + dicom.length + dataset.length;
    const buffer = new ArrayBuffer(totalLength);
    const view = new Uint8Array(buffer);
    
    view.set(preamble, 0);
    view.set(dicom, preamble.length);
    view.set(dataset, preamble.length + dicom.length);
    
    return buffer;
  }

  /**
   * 간단한 DICOM 데이터셋 생성
   */
  private createSimpleDICOMDataset(studyInstanceUID: string, memo: string): Uint8Array {
    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [];
    
    // 최소한의 DICOM 태그들만 사용
    const tags = [
      { tag: [0x0008, 0x0016], vr: 'UI', value: '1.2.840.10008.5.1.4.1.1.88.11' }, // SOP Class UID
      { tag: [0x0008, 0x0018], vr: 'UI', value: this.generateUID() }, // SOP Instance UID
      { tag: [0x0020, 0x000D], vr: 'UI', value: studyInstanceUID }, // Study Instance UID
      { tag: [0x0020, 0x000E], vr: 'UI', value: this.generateUID() }, // Series Instance UID
      { tag: [0x0008, 0x0060], vr: 'CS', value: 'SR' }, // Modality
      { tag: [0x0008, 0x103E], vr: 'LO', value: 'Study Memo' }, // Series Description
      { tag: [0x0040, 0x0031], vr: 'UT', value: memo }, // Study Memo Content
    ];

    for (const tag of tags) {
      // 태그를 4바이트로 변환
      const tagBytes = new Uint8Array(4);
      new DataView(tagBytes.buffer).setUint16(0, tag.tag[0], true);
      new DataView(tagBytes.buffer).setUint16(2, tag.tag[1], true);
      
      // VR을 2바이트로 변환
      const vrBytes = encoder.encode(tag.vr);
      
      // 값 길이를 2바이트로 변환
      const valueBytes = encoder.encode(tag.value);
      const lengthBytes = new Uint8Array(2);
      new DataView(lengthBytes.buffer).setUint16(0, valueBytes.length, true);
      
      chunks.push(tagBytes);
      chunks.push(vrBytes);
      chunks.push(lengthBytes);
      chunks.push(valueBytes);
    }

    // 모든 청크 합치기
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result;
  }

  /**
   * SR 내용 추출
   */
  private async extractSRContent(instanceID: string): Promise<string> {
    try {
      const response = await fetch(`/dicomweb/instances/${instanceID}/file`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (response.ok) {
        const buffer = await response.arrayBuffer();
        return this.parseDICOMSR(buffer);
      } else {
        throw new Error(`Failed to get SR file: ${response.status}`);
      }
    } catch (error) {
      console.error('Error extracting SR content:', error);
      return '';
    }
  }

  /**
   * DICOM SR 파싱
   */
  private parseDICOMSR(buffer: ArrayBuffer): string {
    try {
      const view = new Uint8Array(buffer);
      const decoder = new TextDecoder();
      
      // DICOM 데이터 파싱 (간단한 구현)
      const data = decoder.decode(view);
      
      // 메모 데이터 찾기
      const memoMatch = data.match(/Memo[^\x00]*/);
      if (memoMatch) {
        return memoMatch[0].replace('Memo', '').trim();
      }
      
      return '';
    } catch (error) {
      console.error('Error parsing DICOM SR:', error);
      return '';
    }
  }

  /**
   * UID 생성
   */
  private generateUID(): string {
    return '1.2.826.0.1.3680043.2.135.1.' + Date.now() + '.' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * HTTP 헤더 생성
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (this.config.username && this.config.password) {
      const auth = btoa(`${this.config.username}:${this.config.password}`);
      headers['Authorization'] = `Basic ${auth}`;
    }

    return headers;
  }
}

export { OrthancService };
export type { OrthancConfig, DICOMSRData }; 