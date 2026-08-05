# Market Barkod Görsel Bulucu Web Sistemi

Bu proje, market ürünlerine ait barkod listesini Excel dosyası üzerinden alıp ürün bilgilerini ve ürün görsellerini bulmak için geliştirilmiş web tabanlı bir uygulamadır.

Kullanıcı sisteme barkod listesini `.xlsx` formatında yükler. Barkodlar veritabanına kaydedilir ve ürünler için farklı ücretsiz kaynaklardan ürün adı, marka, kategori ve görsel bilgisi aranır. Bulunan görseller aday olarak gösterilir. Kullanıcı uygun görseli seçerek ürünü onaylayabilir.

Projede ücretli Google API kullanılmamıştır.

## Kullanılan Teknolojiler

- Next.js
- TypeScript
- Tailwind CSS
- MySQL
- Prisma ORM
- SQLyog Community
- xlsx
- Cheerio
- Sharp

## Temel Özellikler

- Excel dosyası ile barkod listesi yükleme
- Barkod, ürün adı ve marka bilgisini veritabanına kaydetme
- Aynı barkod tekrar yüklendiğinde yeni kayıt açmadan mevcut kaydı güncelleme
- Ürünleri listeleme, arama ve duruma göre filtreleme
- Tek ürün için görsel arama
- Toplu görsel arama
- Ürün detay ekranında görsel adaylarını görüntüleme
- Uygun görseli seçme ve ürünü onaylama
- Manuel görsel URL ekleme
- Bilgisayardan manuel görsel yükleme
- Arama, hata ve onay işlemlerini loglama
- Dashboard üzerinden genel durumu görüntüleme
- Onaylanan ürünleri Excel olarak dışa aktarma
- Görselleri ve barkod listesini teslim klasörü olarak hazırlama

## Ekran Görüntüleri

### Dashboard
![Dashboard](images/dashboard.png)

### Ürün Listesi
![Ürün Listesi](images/products.png)

### Excel Yükleme
![Excel Yükleme](images/upload.png)

### Ürün Detayı
![Ürün Detayı](images/product-detail.png)

### Log Kayıtları
![Log Kayıtları](images/logs.png)

## Veri Kaynakları

Ürün bilgisi ve görsel arama için birden fazla kaynak kullanılmıştır:

- OpenFoodFacts
- Wikidata
- Market siteleri üzerinden arama
- DuckDuckGoImages
- Manuel kullanıcı girişi

Genel arama sırası şu şekildedir:

1. OpenFoodFacts üzerinde barkod ile ürün aranır.
2. Sonuç bulunamazsa Wikidata kontrol edilir.
3. Sonuç bulunamazsa market arama yapısı kullanılır.
4. Sonuç bulunamazsa DuckDuckGoImages üzerinden ürün adı ve marka ile görsel aranır.
5. Uygun görsel bulunamazsa kullanıcı manuel olarak görsel ekleyebilir.

Kullanıcı görsel adaylarını kontrol eder ve uygun olanı onaylar.

## Excel Dosya Formatı

Yüklenecek dosya `.xlsx` formatında olmalıdır.

Zorunlu kolon:

- `Barcode`

İsteğe bağlı kolonlar:

- `ProductName`
- `Brand`

Örnek Excel yapısı:

| Barcode | ProductName | Brand |
|---|---|---|
| 8690504016719 | Eti Burçak | Eti |
| 8690632000105 | Ülker Çikolatalı Gofret | Ülker |
| 8690504011726 | Torku Bisküvi | Torku |

## Veritabanı Yapısı

Projede MySQL veritabanı kullanılmıştır.

Ana tablolar:

- `ProductBarcode`
- `ProductImageCandidate`
- `SearchLog`

`ProductBarcode` tablosunda ürünün barkodu, ürün adı, markası, kategorisi, durumu, seçilen görseli ve onay bilgisi tutulur.

`ProductImageCandidate` tablosunda ürün için bulunan görsel adayları tutulur.

`SearchLog` tablosunda yapılan arama, hata, onay ve manuel ekleme işlemleri kayıt altına alınır.

## Ürün Durumları

Sistemde ürünlerin durumları şu şekilde takip edilir:

- `Pending`: Ürün eklendi ancak henüz görsel araması yapılmadı.
- `Searching`: Ürün için arama işlemi devam ediyor.
- `Found`: Ürün için görsel adayı bulundu.
- `NotFound`: Ürün için görsel bulunamadı.
- `Approved`: Ürün kullanıcı tarafından onaylandı.
- `Error`: Arama sırasında hata oluştu.

## Kurulum

Öncelikle MySQL servisinin çalıştığından emin olun.

Projeyi klonladıktan sonra proje klasöründe terminal açın.

Gerekenleri yükleyin:

```powershell
npm.cmd install
```

`.env.example` dosyasını `.env` olarak kopyalayın ve veritabanı bağlantı adresini kendi MySQL şifrenize göre düzenleyin:

```env
DATABASE_URL="mysql://root:YOUR_PASSWORD@127.0.0.1:3306/barcode_image_finder?allowPublicKeyRetrieval=true"
```

Prisma Client oluşturun:

```powershell
npx.cmd prisma generate
```

Veritabanı tablolarını oluşturun:

```powershell
npx.cmd prisma migrate dev
```

Projeyi başlatın:

```powershell
npm.cmd run dev
```

Uygulama çalıştığında tarayıcıdan şu adrese girilebilir:

```text
http://localhost:3000
```

## Sayfalar

- `/dashboard`  
  Sistemdeki toplam ürün, onaylanan ürün, kalan kontrol, indirilen görsel ve log özeti gösterilir.

- `/products`  
  Sistemdeki ürünler listelenir. Arama, filtreleme, görsel arama, detay görüntüleme ve Excel dışa aktarma işlemleri yapılır.

- `/products/upload`  
  Excel dosyası yükleme ekranıdır.

- `/products/[id]`  
  Ürün detay ekranıdır. Ürün bilgileri, seçili görsel, görsel adayları, manuel görsel ekleme ve onaylama işlemleri burada yapılır.

- `/logs`  
  Arama, hata, manuel ekleme ve onay işlemlerinin logları görüntülenir.

## Görsel Kaydetme

Onaylanan ürünlerin görselleri uygulama içinde barkod adıyla kaydedilir.

Örnek:

```text
public/product-images/8690504016719.jpg
```

Bu sayede görseller daha sonra klasör halinde teslim edilebilir.

## Dışa Aktarma ve Teslim

Ürün listesi Excel olarak dışa aktarılabilir.

Excel çıktısında genel olarak şu bilgiler bulunur:

- Barkod
- Ürün adı
- Marka
- Kategori
- Kaynak
- Durum
- Onay
- Skor
- Görsel dosya adı
- Görsel klasör yolu
- Uygulama içi görsel yolu

Ayrıca teslim klasörü oluşturularak barkod Excel dosyası ve ürün görselleri birlikte hazırlanabilir.

## Teslim Verileri

Bu GitHub reposunda yalnızca projenin kaynak kodları ve uygulama ekran görüntüleri bulunmaktadır.

Ürün görselleri, dışa aktarılan Excel dosyaları ve veritabanı yedeği dosya boyutunu artırmamak için repoya eklenmemiştir.

## Notlar

Bazı dış kaynaklar zaman zaman istek sınırı veya sunucu yoğunluğu nedeniyle hata döndürebilir. Özellikle `429`, `502` veya `503` hataları görülebilir. Bu durumda arama işlemi daha sonra tekrar denenebilir.

Görseller otomatik olarak adaylara eklenir ancak son karar kullanıcıya bırakılmıştır. Bunun sebebi, dış kaynaklardan gelen görsellerin her zaman doğru ürün görseli olmamasıdır.

Bu nedenle sistemde manuel kontrol, manuel görsel ekleme ve onay mekanizması kullanılmıştır.
