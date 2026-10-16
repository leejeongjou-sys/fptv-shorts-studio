# FP TV 쇼츠 스튜디오

페플TV 롱폼 영상에서 쇼츠를 만드는 웹앱입니다. Vercel에 올리고 Firebase(Firestore)에 저장합니다.

| 화면 | 하는 일 |
|---|---|
| `/` 현황 | 검토할 대본·제작 대기·완료 숫자, 최근 쇼츠 |
| `/shorts` 쇼츠 만들기 | 전체 대본 읽기 → ① 요약 / ② 개별 / ③ 드래그 → 대본 검토 → **확정** |
| `/map/longform` | 롱폼 → 쇼츠 마인드맵 (가지 편집·메모) |
| `/map/magazine` | 매거진 에디터 업무 지도 (가지 편집·메모) |

영상 렌더링은 지금처럼 **PC 예약 작업**(매시 29분)이 합니다. 웹에서 `확정`을 누르면 PC 작업이 `/api/queue`로 확정된 쇼츠를 가져가 프리미어에서 만들고, 완료 상태와 영상 링크를 다시 써 넣습니다.

## 1. Firebase 준비 (Brand Studio 프로젝트 재사용 가능)

1. Firebase 콘솔 → 프로젝트 설정 → 내 앱 → 웹 앱 SDK 설정 값을 복사합니다.
2. Authentication → 로그인 방법 → **익명** 사용 설정.
3. Firestore 규칙에 `firestore.rules`의 `fptv_` 블록을 **기존 규칙에 덧붙여** 게시합니다. (통째로 바꾸면 Brand Studio 규칙이 사라지니 주의)
4. 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성 → JSON 파일 내용 전체를 한 줄로 `FIREBASE_SERVICE_ACCOUNT`에 넣습니다.

컬렉션은 모두 `fptv_` 로 시작합니다: `fptv_longform`, `fptv_shorts`, `fptv_mapNodes`, `fptv_mapNotes`, `fptv_status`.

## 2. Vercel 배포

1. 이 레포를 Vercel에서 Import.
2. Environment Variables에 `.env.example`의 값을 모두 넣습니다.
   - `SITE_PASSWORD`: 팀 비밀번호 (비우면 잠금 없음)
   - `QUEUE_TOKEN`: 아무 긴 문자열. PC 작업에도 같은 값을 줍니다.
3. Deploy.

Firebase 값이 없으면 앱은 **이 브라우저에만 저장**하는 체험 모드로 열립니다(오른쪽 위에 표시).

## 3. PC 예약 작업 연결

헤더: `Authorization: Bearer <QUEUE_TOKEN>`

```bash
# 확정된 쇼츠 가져오기 (영상 만들 차례)
curl -H "Authorization: Bearer $QUEUE_TOKEN" "https://<도메인>/api/queue?col=shorts&status=확정"
# 수정 요청 들어온 완성본
curl -H "Authorization: Bearer $QUEUE_TOKEN" "https://<도메인>/api/queue?col=shorts&status=수정 요청"

# 시작할 때 / 끝났을 때 상태 쓰기
curl -X POST -H "Authorization: Bearer $QUEUE_TOKEN" -H "content-type: application/json" \
  -d '{"col":"shorts","id":"<id>","data":{"status":"제작 중"}}' https://<도메인>/api/queue
curl -X POST ... -d '{"col":"shorts","id":"<id>","data":{"status":"완료","output":"U:\\[쇼츠]\\...\\01_v2.mp4","videoUrl":"https://..."}}'

# 롱폼 전체 대본 올리기 (폴더 넣기 단계)
#  lines: [[시작초, 끝초, "문장"], ...]   chapters: [{"k": 시작줄번호, "title": "1. 경량 패딩"}]
curl -X POST ... -d '{"col":"longform","id":"lf-20261016-padding","data":{"project":"20261016_경량패딩","title":"10만원대 경량패딩","folder":"U:\\[쇼츠]\\...","issue":"경량패딩","lines":[...],"chapters":[...],"createdAt":1792100000000}}'

# ① 요약 나레이션 요청 처리: longform 중 narration.status == "요약 요청" 인 것에
#   narration.summary(구간 요약) 와 narration.text(한 줄 = 자막 한 컷) 를 써 넣고 status 를 "대본 검토"로
# 마인드맵 메모 답 달기: mapNotes 중 reply 없는 것에 {"reply":"...","replyAt":...}
curl -H "Authorization: Bearer $QUEUE_TOKEN" "https://<도메인>/api/queue?col=mapNotes&map=longform"
```

### 쇼츠 문서 모양 (`fptv_shorts`)

기존 매거진 에디터 아티팩트와 같은 모양입니다.

```
{ project, folder, issue, no:"01", title, kind:"요약|개별|드래그",
  status:"대본 검토|대본 수정됨|확정|제작 중|완료|수정 요청",
  lines:[{ id, t0, t1, text, on, ctx, fb }],   // on=쓸 줄, ctx=앞뒤 문맥 줄, fb=컷 피드백
  fixes:[{ text, at, by, done }], output, videoUrl, memo, updatedAt, updatedBy }
```

기존 아티팩트 데이터는 `{ "longform": [...], "shorts": [...] }` JSON으로 만들어 `쇼츠 만들기 → 기존 데이터 가져오기`로 옮길 수 있습니다.

## 로컬 실행

```bash
npm install
cp .env.example .env.local   # 값 채우기
npm run dev
```
