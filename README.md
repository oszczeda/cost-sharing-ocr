# Studencki Podział Kosztów z OCR

Aplikacja korzystająca z React Native do rozliczania się ze współlokatorami lub znajomymi z wyjazdów, wzbogacona o skanowanie paragonów.

- **Autorzy:** grupa Nazwa1
- **Technologia:** React Native (Expo), TypeScript

## Planowane moduły
- Tworzenie grup (np. "Mieszkanie"), wprowadzanie wydatków. Aplikacja wylicza, kto komu ile jest dłużny. Dodatkowa funkcja to zrobienie zdjęcia paragonu, z którego aplikacja automatycznie zczytuje kwotę.
- Część mobilna korzystająca z Expo: formularze, nawigacja, obsługa aparatu do zdjęć paragonów, animacje wykresów długów.
- Supabase z gotowym SDK do React Native bazująca na PostgreSQL
- OCR API z Google Cloud Vision – wysyłanie zdjęcia paragonu, asynchroniczne odbieranie odczytanej kwoty.
- system CRUD  przez REST API, wysyłanie zdjęć na serwer, zarządzanie stanem poprzez Zustand.
