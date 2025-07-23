# Study Memo 기능

OHIF 뷰어에 DICOM SR을 사용한 Study Memo 기능을 추가합니다.

## 기능

- Study별 메모 작성 및 저장
- DICOM SR 형태로 Orthanc에 저장
- 메모 불러오기 및 수정
- OHIF 디자인에 맞는 UI

## 컴포넌트

### StudyMemoModal
메모 작성/편집을 위한 모달 컴포넌트

```tsx
import { StudyMemoModal } from './StudyMemoModal';

<StudyMemoModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  studyInstanceUID="1.2.3.4.5.6.7.8.9"
  onSaveMemo={handleSaveMemo}
  onLoadMemo={handleLoadMemo}
/>
```

### StudyMemoButton
Thumbnail에 추가되는 메모 버튼

```tsx
import { StudyMemoButton } from './StudyMemoButton';

<StudyMemoButton
  displaySetInstanceUID="display-set-uid"
  studyInstanceUID="study-uid"
  onClick={handleMemoClick}
/>
```

### StudyMemoService
DICOM SR을 사용한 메모 저장/불러오기 서비스

```tsx
import { StudyMemoService } from '../../services/StudyMemoService';

const studyMemoService = new StudyMemoService('http://localhost:8042');

// 메모 저장
await studyMemoService.saveMemo(studyInstanceUID, memoText);

// 메모 불러오기
const memo = await studyMemoService.loadMemo(studyInstanceUID);
```

## 사용법

### 1. Thumbnail에 Study Memo 버튼 추가

```tsx
import { StudyMemoExtension } from './StudyMemoExtension';

// 기존 ThumbnailMenuItems를 확장
const EnhancedThumbnailMenuItems = (props) => (
  <StudyMemoExtension
    {...props}
    originalMenuItems={<OriginalThumbnailMenuItems {...props} />}
  />
);
```

### 2. Study Browser에서 사용

```tsx
import { StudyBrowser } from '../StudyBrowser';

<StudyBrowser
  // ... 기존 props
  ThumbnailMenuItems={EnhancedThumbnailMenuItems}
/>
```

## DICOM SR 구조

메모는 다음과 같은 DICOM SR 구조로 저장됩니다:

```json
{
  "StudyInstanceUID": "1.2.3.4.5.6.7.8.9",
  "SOPClassUID": "1.2.840.10008.5.1.4.1.1.88.11",
  "Modality": "SR",
  "ContentTemplateSequence": [{
    "TemplateIdentifier": "StudyMemo",
    "TemplateVersion": "1.0",
    "ContentSequence": [{
      "RelationshipType": "CONTAINS",
      "ValueType": "TEXT",
      "TextValue": "메모 내용",
      "ConceptNameCodeSequence": [{
        "CodeValue": "StudyMemo",
        "CodingSchemeDesignator": "OHIF",
        "CodeMeaning": "Study Memo"
      }]
    }]
  }]
}
```

## 설정

### Orthanc URL 설정

```tsx
const studyMemoService = new StudyMemoService('http://your-orthanc-server:8042');
```

### 기본값
- Orthanc URL: `http://localhost:8042`

## 주의사항

1. Orthanc 서버가 실행 중이어야 합니다
2. CORS 설정이 필요할 수 있습니다
3. 실제 DICOM SR 라이브러리 사용을 권장합니다
4. 에러 처리를 추가하세요

## 개발

### 로컬 개발

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

### 테스트

```bash
# 테스트 실행
npm test
```

## 라이센스

OHIF 프로젝트와 동일한 라이센스를 따릅니다. 