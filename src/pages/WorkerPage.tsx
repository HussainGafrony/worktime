import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api';
import { Alert, Header, Stat, type SharedPageProps } from '../components/Common';
import { WorkerEntriesTable } from '../components/EntriesTable';
import { errorMessage, t } from '../i18n';
import { formatHours, formatSubmittedAt, isSunday, localToday, makeTimeOptions } from '../lib/date';
import type { Entry, Site, WorkMessage, WorkerEntriesResponse, WorkerHoursSummary } from '../types';

const timeOptions = makeTimeOptions();
type WorkerTab = 'home' | 'records' | 'messages';

function ExpandableText({ text, lang }: { text: string; lang: SharedPageProps['lang'] }) {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > 240;
  return (
    <div className="message-text">
      <p>{long && !expanded ? text.slice(0, 240) + '…' : text}</p>
      {long && <button type="button" className="text-button" onClick={() => setExpanded((v) => !v)}>{t(lang, expanded ? 'showLess' : 'showMore')}</button>}
    </div>
  );
}

export function WorkerPage({ lang, setLang, logout, name }: SharedPageProps) {
  const today = localToday();
  const [tab, setTab] = useState<WorkerTab>('home');
  const [date, setDate] = useState(today);
  const [site, setSite] = useState('');
  const [sites, setSites] = useState<Site[]>([]);
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('16:00');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [hoursSummary, setHoursSummary] = useState<WorkerHoursSummary>({ regular: 0, overtime: 0, total: 0 });
  const [records, setRecords] = useState<WorkerEntriesResponse | null>(null);
  const [recordPage, setRecordPage] = useState(1);
  const [messages, setMessages] = useState<WorkMessage[]>([]);
  const [unreadReplies, setUnreadReplies] = useState(0);
  const [composeOpen, setComposeOpen] = useState(false);
  const [messageDraft, setMessageDraft] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const sunday = isSunday(date);

  const handleError = (err: unknown) => {
    if (err instanceof ApiError && err.code === 'AUTH_REQUIRED') logout();
    setError(errorMessage(lang, err));
  };

  const loadHome = async () => {
    setLoading(true); setError('');
    try {
      const [siteRows, entryRows, summary, unread] = await Promise.all([
        api<Site[]>('/sites'),
        api<Entry[]>('/entries'),
        api<WorkerHoursSummary>('/worker/summary'),
        api<{ count: number }>('/worker/messages/unread-count')
      ]);
      setSites(siteRows); setEntries(entryRows); setHoursSummary(summary); setUnreadReplies(unread.count);
    } catch (err) { handleError(err); } finally { setLoading(false); }
  };

  const loadRecords = async (targetPage = recordPage) => {
    setLoading(true); setError('');
    try {
      const result = await api<WorkerEntriesResponse>(`/worker/entries?page=${targetPage}&pageSize=20`);
      setRecords(result); setRecordPage(result.pagination.page);
    } catch (err) { handleError(err); } finally { setLoading(false); }
  };

  const loadMessages = async () => {
    setLoading(true); setError('');
    try {
      setMessages(await api<WorkMessage[]>('/worker/messages'));
      setUnreadReplies(0);
    } catch (err) { handleError(err); } finally { setLoading(false); }
  };

  useEffect(() => { void loadHome(); }, []);
  useEffect(() => {
    if (tab === 'records') void loadRecords(recordPage);
    if (tab === 'messages') void loadMessages();
  }, [tab, recordPage]);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setMessage(''); setError(''); setSaving(true);
    try {
      await api('/entries', { method: 'POST', body: JSON.stringify({ date, site, start: sunday ? null : start, end: sunday ? null : end }) });
      setMessage(t(lang, 'submitted'));
      await loadHome();
    } catch (err) { handleError(err); } finally { setSaving(false); }
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault(); setMessage(''); setError('');
    const body = messageDraft.trim();
    if (!body) { setError(t(lang, 'messageRequired')); return; }
    setSaving(true);
    try {
      await api('/worker/messages', { method: 'POST', body: JSON.stringify({ body }) });
      setMessageDraft(''); setComposeOpen(false); setMessage(t(lang, 'messageSent'));
      await loadMessages();
    } catch (err) { handleError(err); } finally { setSaving(false); }
  };

  return (
    <main className="shell wide">
      <Header title={t(lang, 'worker')} lang={lang} setLang={setLang} logout={logout} name={name} />
      <nav className="nav portal-nav" aria-label={t(lang, 'worker')}>
        {(['home', 'records', 'messages'] as WorkerTab[]).map((item) => (
          <button type="button" key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>
            {t(lang, item === 'records' ? 'myRecords' : item)}
            {item === 'messages' && unreadReplies > 0 && <span className="nav-badge">{unreadReplies}</span>}
          </button>
        ))}
      </nav>

      {error && <Alert kind="error">{error}</Alert>}
      {message && <Alert kind="success">{message}</Alert>}

      {tab === 'home' && <>
        <section className="card worker-hours-summary">
          <h2>{t(lang, 'workHoursSummary')}</h2>
          <div className="stats worker-summary-stats">
            <Stat value={formatHours(hoursSummary.regular)} label={t(lang, 'totalRegular')} />
            <Stat value={formatHours(hoursSummary.overtime)} label={t(lang, 'totalOvertime')} />
            <Stat value={formatHours(hoursSummary.total)} label={t(lang, 'totalHours')} />
          </div>
          <Alert kind="info">{t(lang, 'sundayTotalsNote')}</Alert>
        </section>

        <form className="card" onSubmit={submit}>
          <h2>{t(lang, 'newEntry')}</h2>
          <div className="form-grid">
            <div><label htmlFor="entry-date">{t(lang, 'date')}</label><input id="entry-date" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} required /></div>
            <div><label htmlFor="entry-site">{t(lang, 'workSite')}</label><select id="entry-site" value={site} onChange={(e) => setSite(e.target.value)} required><option value="">{t(lang, 'selectSite')}</option>{sites.map((row) => <option key={row._id} value={row._id}>{row.name}</option>)}</select></div>
          </div>
          {!sunday ? <div className="two">
            <div><label htmlFor="entry-start">{t(lang, 'start')}</label><select id="entry-start" value={start} onChange={(e) => setStart(e.target.value)}>{timeOptions.map((value) => <option key={value}>{value}</option>)}</select></div>
            <div><label htmlFor="entry-end">{t(lang, 'finish')}</label><select id="entry-end" value={end} onChange={(e) => setEnd(e.target.value)}>{timeOptions.map((value) => <option key={value}>{value}</option>)}</select></div>
          </div> : <Alert kind="info">{t(lang, 'sundayNote')}</Alert>}
          <button className="primary" type="submit" disabled={saving || loading}>{saving ? t(lang, 'saving') : t(lang, 'submit')}</button>
        </form>

        <section className="card">
          <h2>{t(lang, 'recentEntries')}</h2>
          {loading ? <p className="muted">{t(lang, 'loading')}</p> : <WorkerEntriesTable entries={entries} lang={lang} />}
        </section>
      </>}

      {tab === 'records' && <section className="card">
        <div className="section-heading"><div><h2>{t(lang, 'myRecords')}</h2><p className="muted">{t(lang, 'recordsIntro')}</p></div></div>
        {loading ? <p className="muted">{t(lang, 'loading')}</p> : <WorkerEntriesTable entries={records?.items || []} lang={lang} />}
        {records && records.pagination.total > 0 && <div className="pagination">
          <button type="button" disabled={records.pagination.page <= 1} onClick={() => setRecordPage((p) => Math.max(1, p - 1))}>‹</button>
          <span>{records.pagination.page} / {records.pagination.pages} · {records.pagination.total}</span>
          <button type="button" disabled={records.pagination.page >= records.pagination.pages} onClick={() => setRecordPage((p) => p + 1)}>›</button>
        </div>}
      </section>}

      {tab === 'messages' && <section className="card">
        <div className="section-heading">
          <div><h2>{t(lang, 'messages')}</h2><p className="muted">{t(lang, 'messagesIntro')}</p></div>
          <button type="button" className="primary compact compose-button" onClick={() => setComposeOpen(true)}><span aria-hidden="true">＋</span> {t(lang, 'newMessage')}</button>
        </div>
        {loading ? <p className="muted">{t(lang, 'loading')}</p> : messages.length === 0 ? <div className="empty-state"><strong>{t(lang, 'noMessages')}</strong><span className="muted">{t(lang, 'messagesIntro')}</span></div> :
          <div className="message-list">{messages.map((row) => <article className="message-card" key={row._id}>
            <div className="message-meta"><strong>{name}</strong><time>{t(lang, 'messageDate')}: {formatSubmittedAt(row.createdAt)}</time></div>
            <ExpandableText text={row.body} lang={lang} />
            {row.adminReply && <div className="reply-box"><strong>{t(lang, 'accountantReply')}</strong><ExpandableText text={row.adminReply} lang={lang} />{row.repliedAt && <time>{formatSubmittedAt(row.repliedAt)}</time>}</div>}
          </article>)}</div>}
      </section>}

      {composeOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => setComposeOpen(false)}>
        <form className="modal-card" onSubmit={sendMessage} onMouseDown={(e) => e.stopPropagation()}>
          <div className="section-heading"><h2>{t(lang, 'newMessage')}</h2><button type="button" className="icon-button" onClick={() => setComposeOpen(false)}>×</button></div>
          <Alert kind="info">{t(lang, 'messagePermanent')}</Alert>
          <label htmlFor="worker-message">{t(lang, 'messageText')}</label>
          <textarea id="worker-message" value={messageDraft} onChange={(e) => setMessageDraft(e.target.value)} rows={7} maxLength={4000} required autoFocus />
          <div className="character-count">{messageDraft.length} / 4000</div>
          <div className="modal-actions"><button type="button" onClick={() => setComposeOpen(false)}>{t(lang, 'cancel')}</button><button className="primary compact" type="submit" disabled={saving || !messageDraft.trim()}>{saving ? t(lang, 'saving') : t(lang, 'sendMessage')}</button></div>
        </form>
      </div>}
    </main>
  );
}
