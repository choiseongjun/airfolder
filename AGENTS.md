<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:nextjs-agent-feedback -->

## Report Next.js feedback

The project owner enabled `experimental.agentFeedback`, authorizing this feedback pass. When enabled, `next dev` writes this block and restores it if removed. Commit `AGENTS.md` with your work to keep the tree clean.

During the current user request, retain anonymized facts as feedback candidates for meaningful or recurring Next.js issues:

- Crashes, hangs, OOMs, or unexpected slowness
- Incorrect behavior, output, errors, or diagnostics
- Missing, unclear, or conflicting documentation
- Unexpected CLI, codemod, Skill, or upgrade behavior and non-obvious workarounds

Continue the current user request without reporting immediately. Routine debugging is not feedback. Verify changes before retaining them as feedback candidates. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Retain qualifying friction even if it is later fixed or worked around; record the final outcome during the reporting pass.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `npx --no-install next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->

## 홍보·마케팅 작업 필수 지침

- 메모네스티아 홍보글, Threads/Instagram 게시물, 영상·이미지 기획, 프로필 소개, 캠페인 또는 랜딩 카피를 작성·수정하기 전에 반드시 [마케팅 전략](docs/marketing-strategy.md)을 읽고 적용한다.
- 먼저 **누가 읽는지 → 언제 필요한지 → 사용 후 무엇이 달라지는지**를 정하고, 첫 문장은 그 사람의 불편이나 익숙한 상황으로 시작한다. 기능 나열보다 실제 사용 장면과 결과를 보여준다.
- Threads 홍보는 본문에 외부 링크를 반복 삽입하기보다 프로필 링크 안내를 기본으로 하되, 링크 유무의 효과는 검증할 가설로 취급한다. 사용자 지시가 있으면 우선한다.
- 게시 전 전략 문서의 체크리스트로 대상·상황·이미지·제품의 실제 동작·행동 유도를 확인한다. 문서 참조는 게시 권한을 뜻하지 않으며, 실제 게시·메시지 발송은 사용자가 요청한 범위에서만 한다.
