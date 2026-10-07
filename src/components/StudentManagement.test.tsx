import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StudentManagement } from './StudentManagement';
import { store } from '../lib/store';

// Mock the store so the component doesn't actually hit the database/backend during tests
vi.mock('../lib/store', () => ({
  store: {
    students: [],
    classes: ['X IPA 1', 'X IPA 2'],
    attendance: [],
    teachers: [],
    settings: {
      enableTelegramBot: false,
      telegramBotToken: '',
      telegramChatId: '',
    },
    getStudents: vi.fn(() => []),
    getAttendance: vi.fn(() => []),
    fetchFromServer: vi.fn(),
    subscribe: vi.fn(() => () => {}), // Return a cleanup function
  },
  isGenericQrCode: vi.fn(),
}));

describe('StudentManagement Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing and displays the search input', () => {
    render(<StudentManagement userRole="Admin" />);
    
    // Check if a common element exists, e.g., a search bar or a "Tambah Siswa" button
    // The exact text will depend on your UI
    const searchInput = screen.getByPlaceholderText(/cari/i);
    expect(searchInput).toBeTruthy();
  });

  // You can add more tests here, for example simulating clicks on "Tambah Siswa"
});
