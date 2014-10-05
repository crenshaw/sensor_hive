<?php

namespace Uplabs;

use PDO;

class DatabaseManager
{
    /** @var PDO */
    public $pdo;

    /**
     * Description: Takes post data and inserts into experiment_data table
     *
     * @param $post
     * @return bool - true   -- if data was inserted --OR--
     *                false  -- if data could not be inserted
     */
    public function insert($post)
    {
        //Base SQL statement
        $statement = "INSERT INTO experiment_data VALUES";

        //Properly en-quote all values in post
        $values = array_map([$this->pdo, "quote"], $post);

        //Create a parenthesized string from post array
        $row = "(" . implode(', ', $values) . ")";

        //Attach post-values string to base SQL statement
        $statement.=$row;

        //Prepare the statement
        $sql = $this->pdo->prepare($statement);

        //Insert the data
        $result = $sql->execute();

        return $result;
    }
}
 