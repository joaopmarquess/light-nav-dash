import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, lastAssistantMessageIsCompleteWithToolCalls, type UIMessage } from "ai";
import { RotateCcw } from "lucide-react";
import logoIcon from "@/assets/axis-icon.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Button } from "@/components/ui/button";
import { consultarCuboDre, type ConsultaDreIa, type CuboDreIa } from "@/control/dreIa";
import { criarConsultaDreIa } from "@/control/dreIaCarga";

/** Uma conversa única, guardada só neste navegador. */
const CHAVE = "axis.control.dre.ia.v1";
const ler = (): UIMessage[] => {
  if (typeof window === "undefined") return [];
  try { const v = JSON.parse(localStorage.getItem(CHAVE) ?? "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
};
const SUGESTOES = ["Qual o resultado líquido e a margem da DRE?", "Como evoluíram as despesas administrativas mês a mês?", "Quais contas contábeis têm os maiores valores realizados?"];

export type DadosDreIa = { cubo: CuboDreIa | null; contexto: string };

function mensagemErro(e: Error | undefined) {
  if (!e) return null;
  try { const j = JSON.parse(e.message); if (j?.error) return String(j.error); } catch { /* texto simples */ }
  return e.message || "A IA não conseguiu responder agora.";
}

export default function DreChatIa({ aberto, onAbertoChange, dados }: { aberto: boolean; onAbertoChange: (v: boolean) => void; dados: () => DadosDreIa }) {
  const dadosRef = useRef(dados);
  dadosRef.current = dados;
  const [transport] = useState(() => new DefaultChatTransport<UIMessage>({
    api: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dre-ia`,
    headers: async (): Promise<Record<string, string>> => {
      const { data } = await supabase.auth.getSession();
      return { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${data.session?.access_token ?? ""}` };
    },
    body: () => ({ contexto: dadosRef.current().contexto }),
  }));
  const [consultar] = useState(() => criarConsultaDreIa(() => dadosRef.current().cubo));
  const composerRef = useRef<HTMLDivElement>(null);
  const focar = () => composerRef.current?.querySelector("textarea")?.focus();
  const [inicial] = useState(ler);
  const [texto, setTexto] = useState("");
  const { messages, sendMessage, status, stop, setMessages, error, addToolOutput, clearError } = useChat<UIMessage>({
    id: "control-dre-ia",
    messages: inicial,
    transport,
    onFinish: ({ messages: completas }) => {
      try { localStorage.setItem(CHAVE, JSON.stringify(completas)); } catch { /* armazenamento indisponível */ }
    },
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall: async ({ toolCall }) => {
      if (toolCall.dynamic || toolCall.toolName !== "consultar_cubo") return;
      try {
        const q = toolCall.input as ConsultaDreIa;
        const cubo = await consultar(q);
        void addToolOutput({ tool: toolCall.toolName, toolCallId: toolCall.toolCallId, output: consultarCuboDre(cubo, q) });
      } catch (e) {
        void addToolOutput({ state: "output-error", tool: toolCall.toolName, toolCallId: toolCall.toolCallId, errorText: e instanceof Error ? e.message : "Falha na consulta ao cubo." });
      }
    },
  });
  const ocupado = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (ocupado) return;
    try { if (messages.length) localStorage.setItem(CHAVE, JSON.stringify(messages)); else localStorage.removeItem(CHAVE); } catch { /* armazenamento indisponível */ }
    if (aberto) focar();
  }, [messages, ocupado, aberto]);

  const enviar = (t: string) => {
    const q = t.trim();
    if (!q || ocupado) return;
    clearError();
    void sendMessage({ text: q });
    setTexto("");
    focar();
  };
  const recomecar = () => { void stop(); setMessages([]); clearError(); localStorage.removeItem(CHAVE); focar(); };
  const ultima = messages.at(-1);
  const aguardando = status === "submitted" || (status === "streaming" && ultima?.role === "assistant" && !ultima.parts.some((p) => p.type === "text" && p.text));

  return (
    <Sheet open={aberto} onOpenChange={onAbertoChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0">
        <SheetHeader className="px-4 py-3 border-b border-border flex-row items-center gap-3 space-y-0">
          <img src={logoIcon.url} alt="" className="h-8 w-8 rounded-md" />
          <div className="flex-1 min-w-0">
            <SheetTitle className="text-base">IA · DRE</SheetTitle>
            <SheetDescription className="text-xs">DRE · Contábil (balancete MV)</SheetDescription>
          </div>
          <Button variant="outline" size="sm" onClick={recomecar} disabled={!messages.length} title="Começar uma nova conversa" className="mr-8 h-8 px-2 rounded-md border border-border text-xs inline-flex items-center gap-1 hover:bg-accent/40 disabled:opacity-50">
            <RotateCcw className="h-3.5 w-3.5" />Nova conversa
          </Button>
        </SheetHeader>

        <Conversation className="flex-1 min-h-0">
          <ConversationContent>
            {!messages.length ? (
              <ConversationEmptyState icon={<img src={logoIcon.url} alt="" className="h-12 w-12 rounded-lg" />} title="Pergunte sobre a DRE" description="Por exemplo:">
                <div className="flex flex-col items-center gap-3">
                  <img src={logoIcon.url} alt="" className="h-12 w-12 rounded-lg" />
                  <p className="text-sm font-medium">Pergunte sobre a DRE</p>
                  <ul className="text-sm text-left space-y-1">
                    {SUGESTOES.map((s) => <li key={s}><Button variant="link" disabled={ocupado || !dadosRef.current().cubo} onClick={() => enviar(s)} className="h-auto p-0 whitespace-normal text-left justify-start">{s}</Button></li>)}
                  </ul>
                </div>
              </ConversationEmptyState>
            ) : messages.map((m) => (
              <Message key={m.id} from={m.role}>
                <MessageContent className="group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground">
                  {m.parts.map((p, i) => {
                    if (p.type === "text") return m.role === "user" ? <p key={i} className="whitespace-pre-wrap">{p.text}</p> : <MessageResponse key={i}>{p.text}</MessageResponse>;
                    if (p.type === "reasoning") return <details key={i} className="text-xs text-muted-foreground"><summary>Raciocínio</summary><MessageResponse>{p.text}</MessageResponse></details>;
                    if (isToolUIPart(p)) return (
                      <Tool key={i} defaultOpen={false}>
                        {p.type === "dynamic-tool"
                          ? <ToolHeader type={p.type} state={p.state} toolName={p.toolName} title="Consulta ao cubo" />
                          : <ToolHeader type={p.type} state={p.state} title="Consulta ao cubo" />}
                        <ToolContent>
                          <ToolInput input={p.input} />
                          <ToolOutput output={p.output} errorText={p.errorText} />
                        </ToolContent>
                      </Tool>
                    );
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))}
            {aguardando && <Shimmer className="text-sm">Consultando os cubos…</Shimmer>}
            {error && <p className="text-sm text-destructive">{mensagemErro(error)}</p>}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div ref={composerRef} className="p-3 border-t border-border">
          <PromptInput onSubmit={(msg) => enviar(msg.text ?? texto)}>
            <PromptInputTextarea autoFocus value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ex.: qual o EBITDA do terceiro trimestre?" />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit status={status} onStop={() => void stop()} disabled={!ocupado && (!texto.trim() || !dadosRef.current().cubo)} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </SheetContent>
    </Sheet>
  );
}
