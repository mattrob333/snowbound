import './styles/main.css';
import { GameApp } from './app/GameApp';

document.addEventListener('DOMContentLoaded', async () => {
  const app = new GameApp();
  await app.init(document.getElementById('app')!);
});