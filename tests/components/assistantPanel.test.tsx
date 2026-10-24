import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from '@app/routes';

const jsonRes = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function mockApi(handler: (url: string, body: unknown) => Response) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => handler(url, init?.body ? JSON.parse(String(init.body)) : null))
  );
}

const renderApp = () => render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/'] })} />);

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('Assistant panel', () => {
  it('opens from the launcher with starters in the chosen language', async () => {
    mockApi(() => jsonRes({ assistant: true, language: true }));
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /ask pravaah/i }));
    expect(await screen.findByRole('dialog', { name: /pravaah assistant/i })).toBeInTheDocument();
    expect(screen.getByText(/what is holding my plan up/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/assistant language/i), { target: { value: 'hi-IN' } });
    expect(screen.getByText(/मेरी योजना किस वजह से रुकी है/)).toBeInTheDocument();
  });

  it('says plainly when no key is configured and does not let you send', async () => {
    mockApi(() => jsonRes({ assistant: false, language: false }));
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /ask pravaah/i }));
    expect(await screen.findByText(/not set up yet/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/your question/i), { target: { value: 'hello' } });
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('answers a question using a tool against the live plan', async () => {
    let chats = 0;
    mockApi((url) => {
      if (url === '/api/health') return jsonRes({ assistant: true, language: true });
      chats++;
      return chats === 1
        ? jsonRes({ data: { choices: [{ message: { content: null, tool_calls: [{ id: 'a', type: 'function', function: { name: 'get_plan_summary', arguments: '{}' } }] } }] } })
        : jsonRes({ data: { choices: [{ message: { content: 'Your licence expires on day 21.' } }] } });
    });
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /ask pravaah/i }));
    const box = await screen.findByLabelText(/your question/i);
    fireEvent.change(box, { target: { value: 'When does it expire?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('Your licence expires on day 21.')).toBeInTheDocument();
    expect(screen.getByText('When does it expire?')).toBeInTheDocument();
  });

  it('shows a busy message without breaking, and closes on Escape', async () => {
    mockApi((url) =>
      url === '/api/health'
        ? jsonRes({ assistant: true, language: true })
        : jsonRes({ error: 'The assistant is busy right now. Please try again in a moment.' }, 503)
    );
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /ask pravaah/i }));
    fireEvent.change(await screen.findByLabelText(/your question/i), { target: { value: 'hi' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(screen.getByText(/busy right now/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled(); // empty draft, but still usable after
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
