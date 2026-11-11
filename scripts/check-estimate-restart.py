"""Upgrade/restart verification. All databases, modified jars and logs are test-owned TemporaryDirectory files."""
import argparse
import http.cookiejar
import json
import os
from pathlib import Path
import subprocess
import shutil
import tempfile
import time
import urllib.request
import urllib.error
import zipfile
from datetime import date, timedelta

parser = argparse.ArgumentParser()
parser.add_argument("--baseline", required=True, help="Phase 2 jar (without persistence tables)")
parser.add_argument("--jar", default=str(Path(__file__).resolve().parents[1] / "backend/target/qonaqai-0.1.0.jar"))
parser.add_argument("--port", type=int, default=18086)
args = parser.parse_args()
base = "http://127.0.0.1:" + str(args.port)
proc = None
opener = None

def request(path, method="GET", body=None, expected=(200,)):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(base + path, data=data, method=method, headers={"Content-Type": "application/json"})
    try:
        response = opener.open(req, timeout=15)
        code, raw = response.status, response.read()
    except urllib.error.HTTPError as failure:
        code, raw = failure.code, failure.read()
    result = json.loads(raw) if raw else None
    assert code in expected, (method, path, code, result)
    return result

def stop():
    global proc
    if proc is not None:
        proc.terminate()
        try:
            proc.wait(timeout=15)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait(timeout=5)
        proc = None

def start(jar, folder, label):
    global proc, opener
    stop()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    env = dict(os.environ, PORT=str(args.port), QONAQ_DB_URL="jdbc:h2:file:" + str(folder / "db/qonaqai") + ";DB_CLOSE_ON_EXIT=FALSE")
    (folder / "db").mkdir(exist_ok=True)
    with (folder / (label + ".log")).open("w") as log:
        proc = subprocess.Popen(["java", "-jar", str(Path(jar).resolve())], cwd=folder, env=env, stdout=log, stderr=subprocess.STDOUT)
    for _ in range(300):
        if proc.poll() is not None:
            raise RuntimeError((folder / (label + ".log")).read_text())
        try:
            request("/api/package-options")
            return
        except (urllib.error.URLError, ConnectionError, TimeoutError):
            time.sleep(0.1)
    raise RuntimeError("Application startup timeout")

credentials = {"email": "restart@example.com", "password": "Restart-test-9876"}
services = [{"type": "PHOTOGRAPHY", "hours": 3}]

def login():
    request("/api/auth/login", "POST", credentials)

def preview(event_id, package="STANDARD"):
    return request("/api/events/" + str(event_id) + "/estimate/preview", "POST", {"packageCode": package, "services": services})

def save_body(quote, version):
    return dict(packageCode=quote["packageCode"], services=services, expectedConfigurationVersion=version,
                packageCatalogVersion=quote["packageCatalogVersion"], serviceCatalogVersion=quote["serviceCatalogVersion"],
                venueCatalogVersion=quote["venueCatalogVersion"], expectedEventInputToken=quote["eventInputToken"],
                expectedPricingToken=quote["pricingToken"])

with tempfile.TemporaryDirectory(prefix="qonaqai-estimate-restart-") as temp:
    folder = Path(temp)
    frozen = folder / "phase3-frozen.jar"
    shutil.copyfile(args.jar, frozen)
    args.jar = str(frozen)
    try:
        start(args.baseline, folder, "phase2")
        request("/api/auth/register", "POST", dict(credentials, name="Restart test"), (201,))
        draft = dict(title="Persistent estimate restart", type="CORPORATE", date=str(date.today()+timedelta(days=30)),
                     guests=80, budget=2000000, strategy="ECONOMY", venueId=1)
        event = request("/api/events", "POST", draft, (201,))["event"]
        event_id = event["id"]
        path = "/api/events/" + str(event_id) + "/package"
        before = request("/api/bootstrap")
        request(path, expected=(404,))
        print("PASS: Phase 2 creates original account/event/venue/notification data in a disposable file H2", flush=True)

        start(args.jar, folder, "phase3-upgrade")
        login()
        after = request("/api/bootstrap")
        for key in ("events", "venues", "notifications", "profile"):
            assert after[key] == before[key], key
        assert all(v["price"] is None for v in after["venues"])
        assert request(path)["configured"] is False
        quote = preview(event_id)
        assert quote["totalCost"] == 670000
        saved = request(path, "PUT", save_body(quote, None))
        assert saved["configurationVersion"] == 0
        assert saved["currentEstimate"]["revision"] == 1
        print("PASS: additive schema upgrade preserves original data; STANDARD + photography 3h saved as 670000 KZT", flush=True)

        start(args.jar, folder, "phase3-restarted")
        login()
        restored = request(path)
        assert restored == saved, (restored, saved)
        assert request("/api/bootstrap")["notifications"] == before["notifications"]
        print("PASS: fresh JVM restores identical estimate ID, version, inputs, package, selections, all rates/lines and total", flush=True)

        changed = folder / "changed-catalogs.jar"
        with zipfile.ZipFile(args.jar) as source, zipfile.ZipFile(changed, "w") as target:
            for info in source.infolist():
                data = source.read(info.filename)
                if info.filename == "BOOT-INF/classes/service-rates.json":
                    rates = json.loads(data)
                    rates["catalogVersion"] = "demo-services-restart-v2"
                    for rate in rates["services"]:
                        if rate["serviceType"] == "PHOTOGRAPHY":
                            rate["unitPrice"] = 30000
                    data = json.dumps(rates, ensure_ascii=False).encode()
                if info.filename == "BOOT-INF/classes/demo-venue-rates.json":
                    rates = json.loads(data)
                    rates["catalogVersion"] = "demo-venues-restart-v2"
                    for rate in rates["rates"]:
                        if rate["venueId"] == 1:
                            rate["price"] = 550000
                    data = json.dumps(rates, ensure_ascii=False).encode()
                target.writestr(info, data)
        start(changed, folder, "phase3-changed-rates")
        login()
        old = request(path)
        assert old["currentEstimate"]["catalogsChanged"] is True
        assert old["currentEstimate"]["estimate"] == saved["currentEstimate"]["estimate"]
        request(path, "PUT", save_body(quote, 0), (409,))
        new_quote = preview(event_id)
        assert new_quote["totalCost"] == 735000
        updated = request(path, "PUT", save_body(new_quote, 0))
        assert updated["configurationVersion"] == 1
        assert updated["currentEstimate"]["revision"] == 2
        history = request(path + "/estimates")
        assert len(history) == 2
        assert history[1]["estimate"] == saved["currentEstimate"]["estimate"]
        assert history[0]["estimate"]["totalCost"] == 735000
        assert all(v["price"] is None for v in request("/api/venues"))
        print("PASS: changed service/venue catalogs do not reprice revision 1; stale catalogs give 409; explicit save creates immutable revision 2", flush=True)
        print("PASS: restart/upgrade test complete; no user database was opened", flush=True)
    finally:
        stop()
