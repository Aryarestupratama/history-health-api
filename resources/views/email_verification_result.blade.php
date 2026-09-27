<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SEKALA — Verifikasi Email</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #F7F7F8;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  .card {
    background: #FFFFFF;
    border-radius: 24px;
    border: 1px solid #E9EAEC;
    padding: 40px 28px 32px;
    max-width: 400px;
    width: 100%;
    text-align: center;
  }
  .icon-wrap {
    width: 76px;
    height: 76px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
  }
  .icon-wrap.success { background: #E1F5EE; }
  .icon-wrap.info    { background: #E6F1FB; }
  .icon-wrap.error   { background: #FCEBEB; }
  .icon-wrap svg { width: 36px; height: 36px; }
  h1 {
    font-size: 19px;
    font-weight: 700;
    color: #0C0C0C;
    margin-bottom: 8px;
  }
  p.desc {
    font-size: 14px;
    color: #6B7280;
    line-height: 1.6;
    margin-bottom: 8px;
  }
</style>
</head>
<body>

  <div class="card">
    @if($status === 'success')
      <div class="icon-wrap success">
        <svg viewBox="0 0 24 24" fill="none" stroke="#0F6E56" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <h1>Email berhasil diverifikasi</h1>
      <p class="desc">
        Akun kamu sudah aktif sepenuhnya. Kembali ke aplikasi SEKALA
        dan login untuk mulai menjelajah sejarah kesehatan Indonesia.
      </p>

    @elseif($status === 'already')
      <div class="icon-wrap info">
        <svg viewBox="0 0 24 24" fill="none" stroke="#185FA5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9"></circle>
          <path d="M12 8v4"></path>
          <path d="M12 16h.01"></path>
        </svg>
      </div>
      <h1>Email sudah diverifikasi</h1>
      <p class="desc">
        Akun ini sudah terverifikasi sebelumnya. Kamu bisa langsung
        login lewat aplikasi SEKALA.
      </p>

    @else
      <div class="icon-wrap error">
        <svg viewBox="0 0 24 24" fill="none" stroke="#A32D2D" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9"></circle>
          <path d="M15 9l-6 6"></path>
          <path d="M9 9l6 6"></path>
        </svg>
      </div>
      <h1>Link tidak valid atau kedaluwarsa</h1>
      <p class="desc">
        Link verifikasi ini sudah tidak berlaku. Buka aplikasi SEKALA,
        login, lalu minta kirim ulang email verifikasi.
      </p>
    @endif

    <p class="desc" style="margin-top: -8px;">
      Kamu bisa tutup halaman ini dan buka aplikasi SEKALA secara manual.
    </p>
  </div>

</body>
</html>