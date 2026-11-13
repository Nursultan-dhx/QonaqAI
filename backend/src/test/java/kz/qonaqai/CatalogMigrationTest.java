package kz.qonaqai;

import java.sql.DriverManager;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import static org.assertj.core.api.Assertions.*;

class CatalogMigrationTest {
    @Test void legacyAreaConstraintIsRelaxedWithoutLosingRowsAndCanRunTwice() throws Exception {
        try (var connection=DriverManager.getConnection("jdbc:h2:mem:legacy-catalog", "sa", "");
             var sql=connection.createStatement()) {
            sql.execute("create table venue (id bigint primary key, area double not null)");
            sql.execute("insert into venue values (1, 982)");
            for (int run=0;run<2;run++)
                ScriptUtils.executeSqlScript(connection, new ClassPathResource("schema-h2.sql"));
            sql.execute("insert into venue values (2, null)");
            try (var rows=sql.executeQuery("select area from venue order by id")) {
                assertThat(rows.next()).isTrue();
                assertThat(rows.getDouble(1)).isEqualTo(982);
                assertThat(rows.next()).isTrue();
                assertThat(rows.getObject(1)).isNull();
                assertThat(rows.next()).isFalse();
            }
        }
    }
}
