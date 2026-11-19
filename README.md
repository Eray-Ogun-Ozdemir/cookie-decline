# Çerez Reddet

Türkçe, İngilizce ve Almanca çerez bildirimlerini ve tanınan site içi bildirim izni isteklerini yöneten Chrome eklentisi. TypeScript, HTML ve CSS ile yazılır; Manifest V3 kullanır.

## VS Code ile başlangıç

1. VS Code → **File / Open Folder** ile bu proje klasörünü aç.
2. **Terminal / New Terminal** menüsünden terminal aç.
3. Aşağıdaki komutları çalıştır (Node.js 20 veya üzeri gerekir):

```sh
npm install
npm run check
```

Bu çalışma alanında bağımlılıklar önceden yüklendiyse yalnızca `npm run check` yeterlidir. Tekrarlanabilir temiz kurulum için `npm ci` kullan.

## Chrome'a yüklemeden önizleme

```sh
npm run preview
```

**http://127.0.0.1:4174** adresini istediğin tarayıcıda aç. Bu mod, eklentiyle aynı ret kurallarını yalnızca örnek sayfada çalıştırır; eklenti kurmak gerekmez. Üstteki anahtarla otomatik işlemleri durdurup açabilirsin. Üç dili, gecikmeli pencereyi, çok adımlı tercihleri ve üst üste gelen iki izin isteğini burada deneyebilirsin.

Önizleme Chrome'un eklenti izinlerini ve eklenti menüsünü sınamaz; bunlar ayrı tarayıcı testiyle veya Chrome'a yükleyerek kontrol edilir. `npm run demo` ise gerçek eklenti için kullanılan, kendi kendine reddetme yapmayan sayfadır.

## Chrome'a yükleme

1. Chrome adres çubuğuna `chrome://extensions` yaz.
2. **Geliştirici modu / Developer mode** seçeneğini aç.
3. **Paketlenmemiş öğe yükle / Load unpacked** düğmesine bas.
4. Bu projenin içindeki **dist** klasörünü seç.
5. Eklentiyi araç çubuğuna sabitle. Açık web sayfalarını bir kez yenile.

Eklenti varsayılan olarak açıktır. Menüsündeki anahtar, tüm sitelerde otomatik reddetmeyi açıp kapatır; açık sayfalara da uygulanır.

## Kendi deneme sayfamız

```sh
npm run demo
```

Chrome'da **http://127.0.0.1:4173** adresini aç.

- Her dil için **Pencereyi göster** düğmesine bas; sonuç **Reddedildi** olmalı.
- **2 saniye sonra göster** ile sonradan ekrana gelen pencereyi dene.
- Eklentiyi kapatıp pencereyi göster; pencere açık kalmalı. Tekrar açınca reddedilmeli.
- **Seçenekleri yönet akışı** ile reklam, analitik ve meşru menfaat anahtarları kapatılıp seçimler kaydedilmeli; zorunlu çerezler açık kalmalı.
- **İki pencereyi birlikte göster** ile bildirim isteğinde **Daha Sonra** seçilmeli, çerez tercihleri ayrıca reddedilmeli.
- Çerez penceresi dışındaki **Reject all** düğmesine otomatik tıklanmamalı.

Sayfa yalnızca deneme içindir; gerçek çerez veya takip isteği oluşturmaz. Gerçek sitelerde mevcut çerez tercihi varsa pencere yeniden çıkmayabilir. İlk denemede kendi örnek sayfamızı kullan.

## Geliştirme

```sh
npm run dev        # TypeScript değişikliklerini izler
npm run typecheck  # Tip kontrolü
npm test           # Ret kuralları ve çalışma davranışı testleri
npm run build      # Chrome'a yüklenecek dist klasörünü üretir
npm run check      # Tip kontrolü + test + derleme
```

Gerçek tarayıcıyla uçtan uca test için bir kez `npx playwright install chromium --no-shell` çalıştır, ardından `npm run test:browser` kullan. Bu kontrol eklentiyi ayrı ve geçici bir tarayıcı profiline yükler; kendi Chrome profiline dokunmaz. Üç dili, geç açılan pencereleri, aç/kapat ayarını, ilgisiz düğmeleri ve farklı origin içindeki iframe'i sınar. Görseller `.test-output` klasörüne yazılır. Playwright'ın [Chrome eklentisi test rehberi](https://playwright.dev/docs/chrome-extensions) temel alınmıştır.

TypeScript değişiklikleri `dev` ile derlenir. HTML, CSS veya manifest değiştiğinde `npm run build` çalıştır. Sonra `chrome://extensions` üzerinden eklentiyi yeniden yükle ve denediğin web sayfasını yenile. VS Code'da varsayılan derleme görevi de hazırdır.

Eklenti yeniden yüklendiğinde açık sayfalardaki eski içerik betikleri çalışmayı bırakır. Güncel sürümün o sayfada devreye girmesi için web sayfasını da yenile. Chrome'un **Hatalar** ekranında önceki sürümden kayıtlar kalabilir; güncel sürümü ve sayfayı yükledikten sonra **Tümünü temizle** ile eski kayıtları temizleyebilirsin. Yeni bir hata oluşursa ayrıca incelenmelidir.

## Sürüm 0.2'nin kapsamı

- Yalnızca tanınan tam düğme metinlerine tıklar: örneğin **Tümünü reddet**, **Reject all**, **Alle ablehnen**, **Yalnızca gerekli çerezler**.
- Tıklamak için bir çerez bildirimi bağlamı arar; kabul et, genel kapat ve belirsiz düğmelere tıklamaz.
- Doğrudan ret yoksa tanınan **Seçenekleri yönetin / Manage options / Optionen verwalten** düğmesini açar. Yalnızca anlamını tanıdığı izin anahtarlarını kapatır; zorunlu çerezlere dokunmaz. Görünür denetimlerin anlamı ve durumu biliniyorsa seçimleri kaydeder; belirsiz veya kapatılamayan bir denetim varsa kaydetmez.
- Google Funding Choices ekranındaki izin ve meşru menfaat denetimleri desteklenir. Görünmez HTML kutularının görünür etiketleri üzerinden işlem yapılır. Ters anlamlı itiraz/opt-out kutularına otomatik müdahale edilmez.
- Site içindeki bildirim izni pencerelerinde **Daha Sonra / Not now / Jetzt nicht** gibi seçenekler tanınır. Netmera'nın çerçeve içindeki özel düğmesi de desteklenir. Bu işlem site isteğini erteler; kalıcı bildirim engeli oluşturmaz ve tarayıcının kendi izin penceresine müdahale etmez.
- Gizli veya devre dışı düğmelere tıklamaz. Aynı düğmeyi tekrar tekrar tıklamaz.
- Sonradan eklenen/değişen pencereleri izler; eşleşen HTTP/HTTPS iframe belgelerinde de çalışır.
- Pencereyi kendisi silmez veya gizlemez; sitenin kendi ret düğmesini çalıştırır. Bu, sitenin ret kararına uyduğunu ya da ağdaki tüm takibin engellendiğini doğrulamaz.
- Tüm tercih menüleri ve Shadow DOM desteklenmez. Birçok site farklı metinler veya özel arayüzler kullanır; bunlar için ayrıca doğrulanmış kurallar gerekir. Açılan bir tercih akışı 30 saniye/100 adım sınırında durur.
- Daha önce kaydedilmiş çerezleri silmez, ağ isteklerini engellemez ve zorunlu çerezleri kaldırmaz.

## İzinler ve veriler

`storage` izni sadece aç/kapat ayarını cihazında saklar. İçerik betiği HTTP/HTTPS sayfalarında çerez arayüzünü bulmak için çalışır; Chrome bu yüzden sitelerdeki verilere erişim uyarısı gösterir. Chrome'un kendi sayfaları ve uzantı çalıştırmayı engellediği sayfalar desteklenmez.

Sunucu, hesap, yapay zekâ API'si, telemetri veya dışarıya veri gönderme yoktur. Tarama geçmişi ya da sayfa içeriği kaydedilmez.

## Dosyalar

- `src/rules.ts`: Düğme metinleri, görünürlük ve çerez bağlamı.
- `src/runner.ts`: Etkinlik kontrolü ve tek tıklama davranışı.
- `src/preferences.ts`: Çok adımlı tercih yönetimi ve izin denetimleri.
- `src/notifications.ts`: Site içi bildirim isteğini erteleme kuralları.
- `src/content.ts`: Sayfa izleme ve ayar değişiklikleri.
- `src/popup.ts`, `public/popup.*`: Eklenti menüsü.
- `public/manifest.json`: Chrome yapılandırması.
- `demo/index.html`: Elle deneme sayfası.
- `tests/`: Otomatik davranış testleri.

Chrome başvuru belgeleri: [İçerik betikleri](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts), [ayar saklama](https://developer.chrome.com/docs/extensions/reference/api/storage), [yerel yükleme](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world).
