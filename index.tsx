import React, { useState, useRef, ChangeEvent } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI } from "@google/genai";
import styled, { createGlobalStyle, keyframes } from "styled-components";

// =======================
//  System prompt
// =======================
const SYSTEM_PROMPT = `
אתה צוות הפקה הוליוודי-דיגיטלי שלם, שמנתח וידאו/תמונה/טקסט של משתמש שרוצה למכור קורס או שירות.
המטרה: לעזור לו להפוך את הסרטון שלו לויראלי ומוכר.

החזרה חייבת להיות בפורמט JSON *תקין בלבד* ללא טקסט מסביב, לפי המפתח הבא:

{
  "director": "ניתוח במאי – נוכחות, שפת גוף, כריזמה, קצב, חיבור למצלמה והמסר הכללי.",
  "casting_director": "ניתוח מלהק – האם האדם משדר אמינות, למי הוא מתאים, האם הוא מתאים לדמות/לקהל.",
  "scriptwriter": "ניתוח תסריטאי – מה עבד בטקסט, מה לא, הצעות למשפט פתיחה חזק (Hook) ולסגירה.",
  "coach": "מאמן אישי – טיפים לשיפור הביטחון, האנרגיה, הנשימה, הקול וההופעה מול מצלמה.",
  "camera_expert": "מומחה מצלמה – הצעות לשיפור תאורה, זוויות צילום, קומפוזיציה ורקע.",
  "action_plan": "תוכנית פעולה מעשית – 3–5 צעדים קונקרטיים לשיפור הסרטון הבא."
}

כל ערך צריך להיות כתוב בעברית עשירה, מקצועית, ברורה, עם דוגמאות וטיפים ישימים.
אין להוסיף טקסט לפני או אחרי ה־JSON.
`;

// =======================
//  Styled Components
// =======================

const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: radial-gradient(circle at top, #282828 0, #050505 55%, #000 100%);
    color: #f5f5f5;
  }

  #root {
    min-height: 100vh;
  }
`;

const gold = "#d4af37";
const dark = "#050505";

const Page = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 40px 16px;
`;

const Card = styled.div`
  width: 100%;
  max-width: 1100px;
  background: radial-gradient(circle at top, rgba(212,175,55,0.08), #050505 60%);
  border-radius: 10px;
  border: 1px solid rgba(212,175,55,0.3);
  box-shadow: 0 20px 60px rgba(0,0,0,0.8);
  padding: 32px 26px 36px;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 32px;
  position: relative;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const Header = styled.div`
  margin-bottom: 20px;
`;

const LogoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
`;

const LogoBox = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: radial-gradient(circle at 30% 0, #ffe49c, ${gold});
  display: flex;
  align-items: center;
  justify-content: center;
  color: #111;
  font-size: 22px;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 32px;
  letter-spacing: 1px;
  color: ${gold};
`;

const Subtitle = styled.p`
  margin: 4px 0 0;
  color: #f5f5f5;
  font-size: 14px;
  opacity: 0.85;
`;

const Tagline = styled.p`
  margin: 12px 0 0;
  font-size: 13px;
  color: #e0e0e0;
  opacity: 0.85;
`;

const FormSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const SectionLabel = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #f0f0f0;
  margin-bottom: 4px;
`;

const UploadBox = styled.label`
  border-radius: 8px;
  border: 1px dashed rgba(255,255,255,0.25);
  padding: 26px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  background: rgba(0,0,0,0.35);
  transition: 0.25s ease all;

  &:hover {
    border-color: ${gold};
    background: rgba(212,175,55,0.06);
  }
`;

const FileName = styled.div`
  font-size: 13px;
  color: #f5f5f5;
  opacity: 0.85;
`;

const UploadNote = styled.div`
  font-size: 11px;
  color: #bbbbbb;
`;

const HiddenInput = styled.input`
  display: none;
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 110px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.18);
  background: rgba(0,0,0,0.45);
  color: #f5f5f5;
  padding: 10px 12px;
  resize: vertical;
  font-size: 13px;
  outline: none;
  transition: 0.2s ease border-color, 0.2s ease box-shadow;

  &:focus {
    border-color: ${gold};
    box-shadow: 0 0 0 1px rgba(212,175,55,0.4);
  }
`;

const ActionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 6px;
`;

const Button = styled.button<{ variant?: "primary" | "ghost" }>`
  position: relative;
  border-radius: 999px;
  padding: 10px 24px;
  font-size: 14px;
  border: none;
  cursor: pointer;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  font-weight: 600;
  overflow: hidden;

  ${({ variant }) =>
    variant === "primary"
      ? `
    background: linear-gradient(135deg, #f7e7a4, ${gold});
    color: #111;
  `
      : `
    background: transparent;
    color: #f5f5f5;
    border: 1px solid rgba(255,255,255,0.25);
  `}

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

const pulse = keyframes`
  0% { opacity: 0; transform: translateX(-30px); }
  50% { opacity: 1; transform: translateX(0px); }
  100% { opacity: 0; transform: translateX(30px); }
`;

const ButtonShine = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(circle at 0 50%, rgba(255,255,255,0.45) 0, transparent 55%);
  animation: ${pulse} 2.8s infinite;
`;

const SmallText = styled.div`
  font-size: 11px;
  color: #aaaaaa;
`;

const RightPane = styled.div`
  border-radius: 8px;
  background: radial-gradient(circle at top, rgba(212,175,55,0.18), rgba(0,0,0,0.85));
  border: 1px solid rgba(212,175,55,0.35);
  padding: 18px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 260px;
`;

const ResultBox = styled.pre`
  flex: 1;
  margin: 0;
  padding: 12px 10px;
  border-radius: 6px;
  background: rgba(0,0,0,0.7);
  border: 1px solid rgba(255,255,255,0.14);
  font-size: 12px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
`;

const ErrorBox = styled.div`
  padding: 10px 10px;
  border-radius: 6px;
  background: rgba(120, 24, 24, 0.85);
  border: 1px solid #ff5252;
  font-size: 12px;
  color: #ffecec;
`;

const StatusText = styled.div`
  font-size: 12px;
  color: #f5f5f5;
`;

// =======================
//  Helpers
// =======================

async function fileToGenerativePart(file: File) {
  return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      const base64Content = base64Data.split(",")[1];
      resolve({
        inlineData: {
          data: base64Content,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// =======================
//  React App
// =======================

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
  };

  const handleClear = () => {
    setFile(null);
    setPrompt("");
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAnalysis = async () => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

    if (!apiKey) {
      setError("חסר מפתח API. ודא שהגדרת VITE_GEMINI_API_KEY בקובץ .env.local וב־Vercel.");
      return;
    }

    if (!file && !prompt.trim()) {
      setError("אנא העלה וידאו/תמונה או כתוב טקסט כדי להתחיל.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const ai = new GoogleGenAI({ apiKey });

      const parts: any[] = [];

      if (file) {
        if (file.size > 20 * 1024 * 1024) {
          throw new Error("הקובץ גדול מדי (מקסימום 20MB).");
        }
        const filePart = await fileToGenerativePart(file);
        parts.push(filePart);
      }

      if (prompt.trim()) {
        parts.push({ text: prompt.trim() });
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts,
          },
        ],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
        },
      });

      const text = (response as any).text?.() ?? (response as any).response?.text ?? "";

      if (!text) {
        setError("לא התקבלה תשובה מהמודל. נסה שוב.");
        return;
      }

      // ננסה לייפות את ה-JSON במידת האפשר
      let pretty = text.trim();
      try {
        const parsed = JSON.parse(pretty);
        pretty = JSON.stringify(parsed, null, 2);
      } catch {
        // אם זה לא JSON תקין, נציג כמו שזה
      }

      setResult(pretty);
    } catch (err: any) {
      console.error(err);
      const message =
        err?.message ||
        "אירעה שגיאה לא צפויה בעת קריאה למודל. בדוק את המפתח ונסה שוב.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <GlobalStyle />
      <Page>
        <Card>
          {/* Left */}
          <div>
            <Header>
              <LogoRow>
                <LogoBox>▶</LogoBox>
                <div>
                  <Title>VIRAL VIDEO DIRECTOR PRO</Title>
                  <Subtitle>ניתוח וידאו מקצועי למכירת קורסים ושירותים</Subtitle>
                </div>
              </LogoRow>
              <Tagline>
                העלה סרטון קצר, תיאור או תסריט – וקבל ניתוח הוליוודי מלא, כולל תוכנית
                ACTION לצילום הבא שלך.
              </Tagline>
            </Header>

            <FormSection>
              <div>
                <SectionLabel>1. העלאת וידאו / תמונה (אופציונלי)</SectionLabel>
                <UploadBox onClick={() => fileInputRef.current?.click()}>
                  <div>לחץ כדי לבחור קובץ וידאו / תמונה</div>
                  <FileName>{file ? file.name : "אין קובץ נבחר"}</FileName>
                  <UploadNote>מקסימום 20MB. פורמטים נפוצים של וידאו ותמונה.</UploadNote>
                  <HiddenInput
                    type="file"
                    accept="video/*,image/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                </UploadBox>
              </div>

              <div>
                <SectionLabel>2. תיאור / תסריט (אופציונלי אבל מומלץ)</SectionLabel>
                <Textarea
                  placeholder="ספר בקצרה על הסרטון, המטרה שלך, והיכן אתה רוצה לשפר..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>

              <ActionRow>
                <Button
                  variant="primary"
                  onClick={handleAnalysis}
                  disabled={loading}
                >
                  {loading ? "מנתח את האקשן..." : "קבל ניתוח מקצועי ACTION!"}
                  <ButtonShine />
                </Button>

                <Button variant="ghost" type="button" onClick={handleClear} disabled={loading}>
                  איפוס
                </Button>

                <SmallText>
                  הנתונים שלך לא נשמרים בשרת – משתמשים בהם רק לצורך ניתוח חד־פעמי.
                </SmallText>
              </ActionRow>
            </FormSection>
          </div>

          {/* Right */}
          <RightPane>
            <SectionLabel>תוצאות הניתוח</SectionLabel>
            {error && <ErrorBox>{error}</ErrorBox>}
            {result && !error && <ResultBox>{result}</ResultBox>}
            {!result && !error && (
              <StatusText>
                עדיין לא בוצע ניתוח. העלה קובץ או כתוב טקסט ולחץ על הכפתור כדי להתחיל.
              </StatusText>
            )}
          </RightPane>
        </Card>
      </Page>
    </>
  );
};

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
