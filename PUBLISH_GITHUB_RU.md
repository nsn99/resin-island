# Публикация интерактивного 3D-острова на GitHub Pages

Этот архив подготовлен для публикации. **Сайт на GitHub пока не опубликован**: для загрузки файлов нужен доступ к вашему GitHub-аккаунту.

## Самый простой вариант: 1 раз настроить репозиторий

1. Перейдите на https://github.com/new (войдите в свой аккаунт).
2. В поле **Repository name** напишите **resin-island**.
3. Выберите **Public** (если нужна открытая ссылка). Оставьте параметры **Add README**, **.gitignore**, **License** выключенными — репозиторий должен быть пустой.
4. Нажмите **Create repository**.
5. Распакуйте `resin-island-github.zip` в папку `Загрузки`.
6. Откройте Terminal (macOS) и выполните команды ниже, заменив `nsn99` на свой GitHub username, если он другой:

```bash
cd ~/Downloads/resin-island-github
git init -b main
git add .
git commit -m "Initial interactive 3D resin island"
git remote add origin https://github.com/nsn99/resin-island.git
git push -u origin main
```

Если GitHub запросит вход, используйте авторизацию в браузере через Git Credential Manager или GitHub CLI. Обычный пароль аккаунта для `git push` по HTTPS GitHub не принимает; потребуется корректный credential helper или personal access token. **Никому не отправляйте токены.**

7. Откройте **Settings → Pages** в созданном репозитории.
8. В разделе **Build and deployment → Source** выберите **GitHub Actions**. Если уже выбрано, ничего менять не надо.
9. В разделе **Actions** убедитесь, что завершилась задача **Publish interactive island to GitHub Pages**. Если Pages были включены после первого коммита, откройте workflow и нажмите **Run workflow → Run workflow**.
10. После успешной публикации сайт должен появиться по адресу **https://nsn99.github.io/resin-island/** (если владелец `nsn99` и название репозитория `resin-island`).

## Что публикуется

Публичный сайт создаётся автоматически из `portable/Interactive_Island.html`: это **проверенная автономная WebGL 2-версия**. Для публикации не нужны `npm install`, Vite и платные сервисы. При каждом новом `git push` в `main` GitHub Actions обновит сайт.

React / Vite / TypeScript / R3F исходники также остаются в репозитории в `src/`, но GitHub Pages пока публикует автономную сборку. React-версия **ещё не проверена полноценной сборкой зависимостей**.

## Устранение неполадок

- **Ошибка `remote: Repository not found`**: репозиторий ещё не создан, неправильно указан username или нет прав.
- **Ошибка `remote origin already exists`**: не повторяйте `git remote add`, вместо этого используйте `git remote set-url origin https://github.com/nsn99/resin-island.git`.
- **Ошибка `Permission denied` / `Authentication failed`**: настройте авторизацию GitHub в Git-клиенте. Не вставляйте пароль в чат и не публикуйте токен.
- **Сайт показывает 404**: дождитесь зелёной галочки в Actions; проверьте Settings → Pages → GitHub Actions и написание username/repository.
- **Зеленый Actions, но пустой экран**: проверьте WebGL 2 и аппаратное ускорение браузера, перезагрузите страницу и попробуйте режим Lite.

> Файлы `index.html` в корне и `portable/Interactive_Island.html` предназначены для разных реализаций. Workflow сознательно копирует автономную версию в публикуемый `index.html`, так что Vite dev-сервер в исходном проекте не ломается.
