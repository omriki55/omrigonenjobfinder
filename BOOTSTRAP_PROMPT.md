# 🚀 Bootstrap Prompt — בנה מנוע חיפוש עבודה משלך

> העתק את הבלוק למטה ל-Claude Code (או claude.ai) והוא יבנה את כל האפליקציה מאפס.
> הוא יתחיל בשאלות אונבורדינג, ואז יבנה את הפייפליין, ה-workflows, והטראקר.

---

```
בנה לי מנוע חיפוש עבודה אוטומטי מבוסס Claude. זו המפרט המלא:

## מטרה
פייפליין שסורק משרות 3× ביום, מנקד כל משרה לפי הפרופיל שלי, ומעדכן טראקר ויזואלי חי ב-GitHub Pages — אוטומטית.

## שלב 0 — אונבורדינג (שאל אותי קודם)
לפני שאתה בונה, שאל אותי:
1. אילו תפקידים אני מחפש?
2. איפה אני מוכן לעבוד? (מיקום / רימוט / מדינות)
3. מה החוזקות והניסיון שלי?
4. בקש ממני להעלות קורות חיים (PDF/TXT)
מהתשובות, צור config.json + profile.md.

## ארכיטקטורה
run_pipeline.py:
  ├─ search_jobs()  → Claude Opus + web_search tool → מוצא משרות פתוחות אמיתיות
  ├─ score_jobs()   → Claude Haiku → מנקד 1-10 לפי הפרופיל
  ├─ filter         → fit_score ≥ 4 + מיקום מתאים
  ├─ save           → scored_jobs.json (מקור אמת יחיד)
  ├─ build          → docs/index.html מתבנית
  └─ git push       → GitHub Pages

## כלל קריטי (אל תפר אותו)
scored_jobs.json הוא מקור האמת היחיד. משרות שאני מוסיף ידנית מקבלות שדה
initial_status. הפייפליין חייב לשמר כל משרה עם initial_status — לעולם לא
למחוק אותן בסריקה אוטומטית. שמור: combined = pipeline_jobs + manual_jobs.

## פרומפט חיפוש (Opus)
"Search LinkedIn Jobs and other job boards for CURRENTLY OPEN positions
(posted in the last 30 days) matching: {roles}.
CRITICAL: Each URL must be a DIRECT link to a SPECIFIC posting.
URLs like indeed.com/jobs?q=... are FORBIDDEN.
Return 8-15 positions as JSON: {company, title, location, url, posted, description}"

## פרומפט ניקוד (Haiku)
"You are evaluating jobs for [profile]. CANDIDATE PROFILE: [roles, strong fit,
weak fit, location OK/reject]. Respond JSON ONLY: {fit_score 1-10, score_reason,
ai_opener, location_ok}. If location_ok false → fit_score=0."

## GitHub Actions
- job-scan.yml: cron 3× ביום (08:00/13:00/18:00 שעון מקומי), permissions: contents: write
- deploy-pages.yml: push ל-docs/ → GitHub Pages

## טראקר (docs/index.html)
HTML יחיד, RTL, mobile-first. כל הסטייט ב-localStorage. לכל משרה כרטיס עם:
- ציון התאמה + סיבה
- סטטוס (שמור/הוגש/ראיון/הצעה/נדחה)
- סבבי ראיונות (תאריך, מראיין, שלב, תוצאה)
- כפתורים: קו"ח מותאם, פנייה, מכתב מקדים (מייצר פרומפט מוכן ל-clipboard), לינק למשרה
- הערות אישיות

## עלויות
השתמש ב-Haiku לניקוד (זול, מהיר) ו-Opus רק לחיפוש (איכות). זה חוסך ~80%.

קרא לי לפני כל החלטת ארכיטקטורה משמעותית. תתחיל באונבורדינג.
```

---

## ⚠️ הערה על LinkedIn

**אין חיבור API ישיר ללינקדאין** — LinkedIn סגרו את ה-Jobs API לציבור ב-2023.

מה שכן עובד (וחוקי):
- **מציאת משרות:** Opus עם `web_search` מוצא פוסטים *ציבוריים* ב-LinkedIn Jobs (לינקים ישירים)
- **סריקה ידנית:** מדביקים URL של משרה → Claude קורא את ה-JD, מנקד התאמה, וכותב מכתב/פנייה מותאם

scraping אוטומטי של LinkedIn מנוגד ל-ToS שלהם ועלול לגרום לחסימה — לכן המערכת מסתמכת על חיפוש ציבורי + עיבוד ידני ע"י Claude.

---

## עלויות

צריך **Anthropic API key** (pay-as-you-go), לא Claude Pro.
~$5-10 לחודש בשימוש רגיל. קרדיט התחלתי של $10 מספיק לחודש+.
