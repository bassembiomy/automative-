import { describe, expect, it, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CodesPage } from './CodesPage';
import { LookupPage } from './LookupPage';
import { ConnectPage } from './ConnectPage';
import { ClearCodesDialog } from '../components/ClearCodesDialog';
import App from '../App';
import { fakeApi, withApi } from '../test/helpers';

describe('CodesPage', () => {
  it('renders the codes from context with explanations', async () => {
    const user = userEvent.setup();
    render(withApi(fakeApi(), <CodesPage />));
    expect(screen.getByText('P0420')).toBeInTheDocument();
    expect(screen.getByText('P0171')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Stored/ })).toHaveTextContent('2');
    expect(screen.getByRole('tab', { name: /Pending/ })).toHaveTextContent('1');
    // expand the first card
    await user.click(screen.getByRole('button', { name: /P0420/ }));
    expect(screen.getByText('Why it happens')).toBeInTheDocument();
    expect(screen.getByText('Suggested fixes')).toBeInTheDocument();
    expect(screen.getByText(/Can I drive\?/)).toBeInTheDocument();
    // pending tab
    await user.click(screen.getByRole('tab', { name: /Pending/ }));
    expect(screen.getByText('P0301')).toBeInTheDocument();
  });

  it('shows severity with text, not only colour', () => {
    render(withApi(fakeApi(), <CodesPage />));
    expect(screen.getAllByText(/medium/i).length).toBeGreaterThan(0);
  });

  it('asks to connect when there is no scan', () => {
    render(withApi(fakeApi({ status: 'disconnected', scan: null }), <CodesPage />));
    expect(screen.getByText('Not connected')).toBeInTheDocument();
  });

  it('requires the checkbox before the clear button is enabled', async () => {
    const user = userEvent.setup();
    const clearCodes = vi.fn().mockResolvedValue(true);
    render(withApi(fakeApi({}, { clearCodes }), <CodesPage />));
    await user.click(screen.getByRole('button', { name: 'Clear codes' }));
    const dialog = screen.getByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'Clear codes' });
    expect(confirm).toBeDisabled();
    await user.click(confirm);
    expect(clearCodes).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('checkbox'));
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    expect(clearCodes).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('ClearCodesDialog', () => {
  it('resets the acknowledgement when re-opened and closes on Escape', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const { rerender } = render(<ClearCodesDialog open onCancel={onCancel} onConfirm={() => {}} />);
    await user.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'Clear codes' })).toBeEnabled();
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalled();
    rerender(<ClearCodesDialog open={false} onCancel={onCancel} onConfirm={() => {}} />);
    rerender(<ClearCodesDialog open onCancel={onCancel} onConfirm={() => {}} />);
    expect(screen.getByRole('button', { name: 'Clear codes' })).toBeDisabled();
  });
});

describe('LookupPage', () => {
  it('finds a code offline and builds a fallback for unknown ones', async () => {
    const user = userEvent.setup();
    render(withApi(fakeApi({ status: 'disconnected', scan: null }), <LookupPage />));
    await user.type(screen.getByLabelText(/Code or keyword/), 'P0301');
    expect((await screen.findAllByText('Cylinder 1 Misfire Detected')).length).toBeGreaterThan(0);
    await user.clear(screen.getByLabelText(/Code or keyword/));
    await user.type(screen.getByLabelText(/Code or keyword/), 'P0999');
    expect(await screen.findByText(/not in the database/i)).toBeInTheDocument();
  });
});

describe('ConnectPage', () => {
  it('explains the Web Serial requirement but still offers the simulator', () => {
    render(withApi(fakeApi({ status: 'disconnected', scan: null, info: null }), <ConnectPage />, '/connect'));
    expect(screen.getByText(/Web Serial is not available/)).toBeInTheDocument();
    expect(screen.getByText(/Chrome or Edge/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try the simulator/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /USB ELM327 adapter/ })).toBeDisabled();
  });

  it('lets the user pick a region and make in step 2', async () => {
    const user = userEvent.setup();
    const setVehicle = vi.fn();
    render(withApi(fakeApi({ status: 'disconnected', scan: null, info: null }, { setVehicle }), <ConnectPage />, '/connect'));
    await user.click(screen.getByRole('radio', { name: /2015 Hyundai Elantra/ }));
    expect(screen.getByRole('button', { name: /Next/ })).toBeEnabled();
  });
});

describe('full app with the simulator', () => {
  it('connects, shows codes, clears them and updates the dashboard', async () => {
    window.location.hash = '#/connect';
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Try the simulator/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Go to dashboard/ })).toBeInTheDocument(), { timeout: 15000 });
    await user.click(screen.getByRole('button', { name: /Go to dashboard/ }));
    await waitFor(() => expect(screen.getByTestId('count-stored')).toHaveTextContent('2'), { timeout: 5000 });
    await user.click(screen.getAllByRole('link', { name: /Trouble Codes/ })[0]);
    expect((await screen.findAllByText('P0420')).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Clear codes' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('checkbox'));
    await user.click(within(dialog).getByRole('button', { name: 'Clear codes' }));
    await waitFor(() => expect(screen.getByText('No stored codes')).toBeInTheDocument(), { timeout: 15000 });
  }, 60000);
});
