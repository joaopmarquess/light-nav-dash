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
import { executarConsultaIa, type ConsultaIa } from "@/lib/inadimplenciaIa";
import type { Titulo } from "@/lib/inadimplencia";

/** Uma conversa única, guardada só neste navegador. */
const CHAVE = "axis.financeiro.inadimplencia.ia.v1";
const ler = (): UIMessage[] => {
  if (typeof window === "undefined") return [];
  try { const v = JSON.parse(localStorage.getItem(CHAVE) ?? "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
};
const SUGESTOES = ["Quantos são os títulos do plano 15?", "Qual a inadimplência por faixa de sinistralidade?", "Quais títulos estão em aberto?"];

export type DadosIa = { titulos: Titulo[] | null; posicao: string; contexto: string };

function mensagemErro(e: Error | undefined) {
  if (!e) return null;
  try { const j = JSON.parse(e.message); if (j?.error) return String(j.error); } catch { /* texto simples */ }
  return e.message || "A IA não conseguiu responder agora.";
}

export default function FinanceiroInadimplenciaIa({ aberto, onAbertoChange, dados }: { aberto: boolean; onAbertoChange: (v: boolean) => void; dados: () => DadosIa }) {
  const dadosRef = useRef(dados);
  dadosRef.current = dados;
  const [transport] = useState(() => new DefaultChatTransport<UIMessage>({
    api: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financeiro-ia`,
    headers: async (): Promise<Record<string, string>> => {
      const { data } = await supabase.auth.getSession();
      return { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${data.session?.access_token ?? ""}` };
    },
    body: () => ({ contexto: dadosRef.current().contexto }),
  }));
  const [inicial] = useState(ler);
  const [texto, setTexto] = useState("");
  const { messages, sendMessage, status, stop, setMessages, error, addToolOutput, clearError } = useChat<UIMessage>({
    id: "financeiro-inadimplencia-ia",
    messages: inicial,
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall: ({ toolCall }) => {
      if (toolCall.dynamic || toolCall.toolName !== "consultar_titulos") return;
      const d = dadosRef.current();
      if (!d.titulos) { addToolOutput({ state: "output-error", tool: toolCall.toolName, toolCallId: toolCall.toolCallId, errorText: "Os títulos ainda estão carregando." }); return; }
      try {
        addToolOutput({ tool: toolCall.toolName, toolCallId: toolCall.toolCallId, output: executarConsultaIa(d.titulos, toolCall.input as ConsultaIa, d.posicao) });
      } catch (e) {
        addToolOutput({ state: "output-error", tool: toolCall.toolName, toolCallId: toolCall.toolCallId, errorText: e instanceof Error ? e.message : "Falha na consulta." });
      }
    },
  });
  const ocupado = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (ocupado) return;
    if (messages.length) localStorage.setItem(CHAVE, JSON.stringify(messages)); else localStorage.removeItem(CHAVE);
  }, [messages, ocupado]);

  const enviar = (t: string) => {
    const q = t.trim();
    if (!q || ocupado) return;
    clearError();
    void sendMessage({ text: q });
    setTexto("");
  };
  const recomecar = () => { void stop(); setMessages([]); clearError(); localStorage.removeItem(CHAVE); };
  const ultima = messages.at(-1);
  const aguardando = status === "submitted" || (status === "streaming" && ultima?.role === "assistant" && !ultima.parts.some((p) => p.type === "text" && p.text));

  return (
    <Sheet open={aberto} onOpenChange={onAbertoChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0">
        <SheetHeader className="px-4 py-3 border-b border-border flex-row items-center gap-3 space-y-0">
          <img src={logoIcon.url} alt="" className="h-8 w-8 rounded-md" />
          <div className="flex-1 min-w-0">
            <SheetTitle className="text-base">IA · Inadimplência</SheetTitle>
            <SheetDescription className="text-xs">Responde com os títulos carregados na tela e as mesmas regras do grid.</SheetDescription>
          </div>
          <button onClick={recomecar} disabled={!messages.length} title="Começar uma nova conversa" className="mr-8 h-8 px-2 rounded-md border border-border text-xs inline-flex items-center gap-1 hover:bg-accent/40 disabled:opacity-50">
            <RotateCcw className="h-3.5 w-3.5" />Nova conversa
          </button>
        </SheetHeader>

        <Conversation className="flex-1 min-h-0">
          <ConversationContent>
            {!messages.length ? (
              <ConversationEmptyState icon={<img src={logoIcon.url} alt="" className="h-12 w-12 rounded-lg" />} title="Pergunte sobre os títulos" description="Por exemplo:">
                <div className="flex flex-col items-center gap-3">
                  <img src={logoIcon.url} alt="" className="h-12 w-12 rounded-lg" />
                  <p className="text-sm font-medium">Pergunte sobre os títulos da tela</p>
                  <ul className="text-sm text-left space-y-1">
                    {SUGESTOES.map((s) => <li key={s}><button onClick={() => enviar(s)} className="text-primary hover:underline text-left">{s}</button></li>)}
                  </ul>
                </div>
              </ConversationEmptyState>
            ) : messages.map((m) => (
              <Message key={m.id} from={m.role}>
                <MessageContent className="group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground">
                  {m.parts.map((p, i) => {
                    if (p.type === "text") return m.role === "user" ? <p key={i} className="whitespace-pre-wrap">{p.text}</p> : <MessageResponse key={i}>{p.text}</MessageResponse>;
                    if (isToolUIPart(p)) return (
                      <Tool key={i} defaultOpen={false}>
                        {p.type === "dynamic-tool"
                          ? <ToolHeader type={p.type} state={p.state} toolName={p.toolName} title="Consulta aos títulos" />
                          : <ToolHeader type={p.type} state={p.state} title="Consulta aos títulos" />}
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
            {aguardando && <Shimmer className="text-sm">Consultando os títulos…</Shimmer>}
            {error && <p className="text-sm text-destructive">{mensagemErro(error)}</p>}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="p-3 border-t border-border">
          <PromptInput onSubmit={(msg) => enviar(msg.text ?? texto)}>
            <PromptInputTextarea autoFocus value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ex.: quantos títulos do plano 15 estão em aberto?" />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit status={status} onStop={() => void stop()} disabled={!ocupado && !texto.trim()} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </SheetContent>
    </Sheet>
  );
}
