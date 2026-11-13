# Источники каталога площадок

Каталог содержит **50 площадок в городе Астана**: исходные ID 1–5 сохранены,
новым площадкам присвоены ID 6–50. Исходные пять записей проверялись
11 ноября 2026 года; новые — 13 ноября 2026 года.

Адреса, вместимость, фотографии и дата проверки сохранены для каждой записи
в `backend/src/main/resources/catalog.json`. Для Radisson, Hilton Garden Inn,
KAZZHOL, Saltanat Saraiy и Farhi Hall использованы сайты самих площадок.
Остальные новые записи взяты из отдельных карточек каталога ALA, где приведены
адреса, схемы банкетной рассадки, ссылки на 2ГИС и аккаунты заведений.
Это данные открытого справочника, а не подтверждение непосредственно от владельца.
Косшы (White Hall, Aruzhan Plaza, Хан Сарайы, SG Wedding Hall) и село Акмол
(AQ SARAI) исключены, хотя справочник показывает их в разделе Астаны.

`capacity` — количество гостей за банкетными столами; `theaterCapacity` —
отдельная театральная рассадка. Они не взаимозаменяемы. Для записей ALA взят
самый большой отдельный зал из раздела «Залы», без суммирования разных залов.
Сцену, декор и окончательную вместимость нужно согласовать с администрацией.

`area: null` означает, что подтверждённая площадь не опубликована. Интерфейс
показывает «Уточняется»; подбор по простору ставит такие площадки после залов
с известной площадью, затем сортирует их по названию.

| ID | Площадка | Зал | Банкет, гостей | Площадь, м² | Источник |
|---:|---|---|---:|---:|---|
| 1 | The Ritz-Carlton, Astana | Grand Ballroom | 500 | 982 | [Сайт площадки](https://www.ritzcarlton.com/en/hotels/tserz-the-ritz-carlton-astana/events/) |
| 2 | The St. Regis Astana | Astor Ballroom | 240 | 518.94 | [Сайт площадки](https://www.marriott.com/en-us/hotels/tsexr-the-st-regis-astana/events/) |
| 3 | Hilton Astana | Grand Ballroom | 350 | 780 | [Сайт площадки](https://www.hilton.com/en/hotels/tsekahi-hilton-astana/events/) |
| 4 | Rixos President Astana | Зал мероприятий | 300 | 492 | [Сайт площадки](https://all.accor.com/hotel/B1Q3/index.en.shtml) |
| 5 | Sheraton Astana Hotel | Ballroom | 180 | 445 | [Сайт площадки](https://www.marriott.com/en-us/hotels/tsesi-sheraton-astana-hotel/events/) |
| 6 | Radisson Hotel, Astana | Sary Arka | 600 | 1120 | [Сайт площадки](https://www.radissonhotels.com/en-us/hotels/radisson-astana/weddings) |
| 7 | Hilton Garden Inn Astana | Garden | 250 | 369 | [Сайт площадки](https://www.hilton.com/en/hotels/tseakgi-hilton-garden-inn-astana/events/) |
| 8 | KAZZHOL Astana | Евразия | 200 | 327 | [Сайт площадки](https://old.kazzhol.com/ru/astana/halls) |
| 9 | Мирас | Банкетный зал | 300 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/miras) |
| 10 | Samruk 777 | Банкетный зал | 300 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/samruk-777) |
| 11 | Esmeralda | Банкетный зал | 240 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/esmeralda) |
| 12 | Алғыс | Большой зал | 130 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/algys) |
| 13 | Wyndham Garden Astana — Garden Hall | Garden Hall | 500 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/garden-hall) |
| 14 | Royal Ballroom | Большой зал | 350 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/royal-ballroom) |
| 15 | KorkemTau | Банкетный зал | 200 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/korkemtau) |
| 16 | Салтанат Сарайы | Банкетный зал | 400 | 1025 | [Сайт площадки](https://saltanatsarayi.kz/) |
| 17 | Традициональ | Царский | 180 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/traditsional) |
| 18 | Жерұйық | Большой зал | 300 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/zheruiyq) |
| 19 | Royal Palace | Большой зал | 500 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/royal-palace) |
| 20 | Palazzo Di Astana | Банкетный зал | 500 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/palazzo-di-astana) |
| 21 | Kobyz Palace | Kobyz Palace | 500 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/kobyz-palace) |
| 22 | Grande Lusso | Большой зал | 500 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/grande-lusso) |
| 23 | AiSara Hall | Банкетный зал | 500 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/aisara-hall) |
| 24 | Mereke Hall | Банкетный зал | 200 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/mereke-hall) |
| 25 | Nur Hall | Банкетный зал | 400 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/nur-hall) |
| 26 | Bageta | Банкетный зал | 250 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/bageta) |
| 27 | ААА Resto hall | Банкетный зал | 300 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/aaa-resto-hall) |
| 28 | Алтын Адам | Банкетный зал | 200 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/altyn-adam) |
| 29 | Алтын Ұя | Банкетный зал | 500 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/altyn-uya) |
| 30 | Байтерек Сарайы | Банкетный зал | 400 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/baiterek-saraiy) |
| 31 | Бақ Сарай | Большой зал | 224 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/baq-sarai) |
| 32 | Гаухартас | Большой зал | 350 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/gaukhartas) |
| 33 | Ғажайып | Большой зал | 300 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/gazhaiyp) |
| 34 | Жеті Қазына | Банкетный зал | 350 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/zheti-qazyna) |
| 35 | Жетіген | Банкетный зал | 300 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/zhetigen) |
| 36 | Кыпшак | Банкетный зал | 250 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/kypshak) |
| 37 | Мейрам | Банкетный зал | 300 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/meiram) |
| 38 | Мерей | Банкетный зал | 180 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/merei) |
| 39 | Меруерт | Банкетный зал | 200 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/meruert) |
| 40 | Тарлан | Большой зал | 240 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/tarlan) |
| 41 | Томирис | Банкетный зал | 250 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/tomiris-korgalzhyn) |
| 42 | Улытау | Банкетный зал | 500 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/ulytau) |
| 43 | Ұлы дала | Банкетный зал | 250 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/uly-dala) |
| 44 | Хан Талапай | Большой зал | 300 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/khan-talapai) |
| 45 | Farhi Hall | Банкетный зал | 300 | — | [Сайт площадки](https://arqa-qz.com/farhi-hall) |
| 46 | Sahil | Зал на 300 | 300 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/sahil) |
| 47 | Portofino | Grand Ball Room | 300 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/portofino) |
| 48 | Tasnim | Банкетный зал | 500 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/tasnim) |
| 49 | Grand Hall Astana | Большой зал | 350 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/grand-hall-astana) |
| 50 | West Hall | Зал на 2-м этаже | 500 | — | [ALA](https://ala.uniqs.kz/toikhana/astana/west-hall) |

## Уточнения характеристик

- Radisson Sary Arka: 600 гостей на банкете, 1200 театром, 1120 м².
  [Конференции](https://www.radissonhotels.com/en-us/hotels/radisson-astana/meeting-events)
  и свадебная страница в таблице описывают разные рассадки.
- Hilton Garden Inn Garden: 250 на банкете, 400 театром, 369 м².
  Секции Garden 1–4 не заведены отдельными площадками.
- KAZZHOL «Евразия»: 200 на банкете, 250 театром.
  [Новая страница зала](https://kazzhol.com/en/astana/conference-rooms/10-evraziya/)
  подтверждает площадь 327 м², а таблица старого официального сайта — рассадки.
- Wyndham Garden: ALA указывает 500 банкетных мест. На
  [официальном сайте](https://wyndhamgardenastana.com/en/conferences/) диапазон
  180–800 относится к различным форматам. Значение 800 не используется как
  банкетная вместимость.
- Farhi Hall: официальный сайт содержит 300 гостей в описании и 350 в таблице.
  Для подбора оставлено консервативное значение 300; площадь и театральная
  вместимость не перенесены из неоднозначной таблицы.
- Rixos: 300 на банкете. Опубликованный максимум 500 не считается театральной
  рассадкой без подтверждения; `theaterCapacity` остаётся `null`.

## Стоимость и учебные сметы

`price` в фактическом каталоге остаётся `null`: меню на гостя, депозит,
почасовая цена и минимальная стоимость аренды с оборудованием не представляют
собой единую фиксированную стоимость площадки для любого события.

Все 50 площадок имеют отдельные **вымышленные DEMO-тарифы** в
`demo-venue-rates.json`. Тарифы ID 1–5 сохранены. Новые учебные тарифы заданы
как 500 ₸ × банкетная вместимость с округлением вверх до 50 000 ₸. Это правило
для демонстрации приложения, а не оценка рыночной стоимости.
Версия каталога тарифов — `demo-venues-v2`. Существующие сохранённые сметы
остаются в базе со своими снимками цен; приложение отмечает изменение версии
каталога и запрашивает новый расчёт перед новой бронью.

## Фотографии

Все 50 карточек используют локальные файлы в
`backend/src/main/resources/static/images/`. Точный исходный URL каждого файла
указан в `imageSourceUrl`. Для первых пяти отелей, Radisson, Hilton Garden Inn,
KAZZHOL и Saltanat Saraiy фотографии получены с сайтов или CDN площадок.
Остальные фотографии взяты из соответствующих карточек ALA.
На части снимков показаны фасад, ресторан, сервировка или детали интерьера,
а не общий вид банкетного зала. Это фотографии из карточек заведений;
они не являются подтверждением конкретной расстановки столов.

Права на фотографии принадлежат соответствующим правообладателям; ссылка на
источник не означает свободную лицензию. Файлы используются в локальном учебном
прототипе; перед коммерческим использованием нужны разрешения или замена на
лицензированные изображения.

## Обновление базы

После обновления схемы Hibernate выполняется `schema-h2.sql`: он снимает старое
ограничение `NOT NULL` с `venue.area`. Скрипт повторяемый и не удаляет записи.
Затем `CatalogSeeder` обновляет записи по стабильному ID через `saveAll`
в транзакции. Удаление таблиц или пользовательских данных не требуется.
Повторный запуск не создаёт дубликатов и сохраняет привязки мероприятий к залам.
Для воспроизведения достаточно собрать приложение и запустить его с обычной
файловой базой из рабочей директории `backend`.
