## 경쟁사 분석 (2026-03 기준)

### 1군: 해외 직접 경쟁 (AI 사업기획서 생성 SaaS)

| 서비스 | 핵심 특징 | 가격 | My CSO 대비 차이점 |
|--------|-----------|------|-------------------|
| **[Upmetrics](https://upmetrics.co/)** | AI 작성 보조 + 재무예측 + 400개 샘플 + 팀 협업 + QuickBooks 연동 | $7~19/월 | 템플릿 채우기 방식. 멀티에이전트 아님, 실시간 시장데이터 수집 없음 |
| **[LivePlan](https://www.liveplan.com/)** | 업계 최대. AI 보조 + 재무관리 + QuickBooks/Xero 연동 + 투자자 피치 | $20/월 | 기존 재무관리 플랫폼에 AI 보조 추가한 형태. 기획서 "자동 생성"보다 "작성 도우미" |
| **[PrometAI](https://prometai.app/)** | SWOT/PESTEL 자동 분석 + 밸류에이션 모델 + 피치덱 + NDA 템플릿 | $55~145/월 | 전략 프레임워크 풍부하나 고가. 단일 LLM 기반, 멀티소스 검색 없음 |
| **[Venturekit](https://www.venturekit.ai/)** | 글 품질 우수 + 재무예측 + 피치덱 빌더 | $16/월 (Pro) | **할루시네이션 심각** (출처 없는 수치 생성). 편집 자유도 낮음 |
| **[Bizplanr](https://bizplanr.ai/)** | 모바일 앱 중심, 10분 완성, 무료 | 무료 | 가볍고 빠르지만 깊이 부족. 시장 검증/근거자료 없음 |
| **[IdeaBuddy](https://ideabuddy.com/)** | 아이디어 검증 + 스코어링 + 가이드형 작성 | 프리미엄 유료 | 아이디어 단계 특화. 풀 기획서보다 초기 검증에 집중 |

### 2군: 국내 직접 경쟁

| 서비스 | 핵심 특징 | 가격 | My CSO 대비 차이점 |
|--------|-----------|------|-------------------|
| **[독스헌트 (DocShunt)](https://docshunt.ai/)** | 정부지원사업 양식 특화, RAG 기반 근거자료, 평균 30장 워드 출력 | 무료~유료 | **가장 직접적 경쟁자**. 정부지원사업 양식에 최적화. 단일 LLM 기반, 에이전트 팀/Devil's Advocate 없음 |
| **[펄스웨이브 (Pulsewave)](https://www.pulsewave.kr/)** | 3분 완성, 400+개 지원사업 양식, 전문가 피드백 시스템 | 저가 | 정부지원사업 특화. 속도 중심, 깊이보다 양식 커버리지 |
| **[뤼튼 도큐먼트](https://wrtn.ai/)** | 범용 AI 문서 작성 (사업계획서 포함), GPT-3.5/HyperCLOVA 기반 | 무료~유료 | 사업기획서 전문이 아닌 범용 문서 도구. 시장데이터 수집 없음 |

### 3군: 간접 경쟁 (범용 AI로 기획서 작성)

| 접근법 | 설명 | My CSO 대비 약점 |
|--------|------|-----------------|
| **ChatGPT/Claude 직접 프롬프팅** | 사용자가 직접 프롬프트를 작성해 기획서 요청 | 구조화 없음, 할루시네이션, 시장데이터 미수집, 반복 프롬프팅 필요 |
| **Gemini Deep Research** | 검색 기반 리서치 가능 | 기획서 양식/구조 없음, 에이전트 팀 아님, 매번 수동 지시 필요 |
| **Canva AI Business Plan** | 디자인 중심 템플릿 + AI 텍스트 채우기 | 시각적 문서에 특화, 깊이 있는 분석 불가 |

### My CSO의 경쟁 포지션 요약

| 비교 축 | 경쟁사 대부분 | My CSO |
|---------|-------------|--------|
| AI 구조 | 단일 LLM 1회 호출 | 5개 전문 에이전트 순차 협업 |
| 시장 데이터 | 없음 또는 단일 소스 | Tavily + Reddit + Google Trends + Product Hunt 4-way 병렬 |
| 할루시네이션 대응 | 제한적 (Venturekit 등 심각) | 출처 강제 + "가상 수치 금지" 시스템 규칙 |
| 자기 검증 | 없음 | Devil's Advocate 에이전트 내장 (섹션 14) |
| 기존 기획서 활용 | 없음 또는 제한적 | Import → 에이전트 팀이 검증/심화/업그레이드 |
| 타겟 시장 | 미국/글로벌 (영어) 또는 정부지원사업(한국) | 한국어 스타트업/신규사업 기획 |

**핵심 인사이트**: 해외 경쟁사들은 "템플릿 + AI 보조 작성" 모델이 대부분이고, 국내 경쟁사(독스헌트, 펄스웨이브)는 정부지원사업 양식에 특화되어 있다. **멀티 에이전트 팀 + 실시간 멀티소스 데이터 + 자기 검증(Devil's Advocate)**을 모두 갖춘 서비스는 현재 확인되지 않음.

### 출처

- [monday.com - 10 Best AI Business Plan Generators (2026)](https://monday.com/blog/crm-and-sales/best-ai-for-business-plan/)
- [LivePlan - 15+ Hours Testing AI Business Plan Writers](https://www.liveplan.com/blog/planning/ai-business-plan-writing-tools-ranked)
- [Upmetrics - AI Business Plan Generators](https://upmetrics.co/blog/ai-business-plan-generators)
- [PrometAI - 7 Best AI Business Plan Generators](https://prometai.app/blog/top-7-best-ai-business-plan-generators)
- [PlanGrowLab - 9 Best AI Business Plan Generators Tested](https://plangrowlab.com/blog/ai-business-plan-generator)
- [독스헌트 AI](https://docshunt.ai/)
- [펄스웨이브](https://www.pulsewave.kr/)
- [AI Times - AI 사업계획서 서비스 등장](https://www.aitimes.com/news/articleView.html?idxno=149728)
